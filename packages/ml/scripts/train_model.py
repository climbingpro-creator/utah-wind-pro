"""
train_model.py — Train XGBoost regressor to predict NWS/HRRR Wind_Error.

Loads the engineered dataset from prepare_data.py, trains an XGBoost model
to predict the gap between the HRRR forecast and actual Utah Lake wind,
then exports the model as JSON for Node.js inference on Vercel.

Usage
─────
  python train_model.py                       # defaults
  python train_model.py --input data.csv      # custom input
  python train_model.py --tune                # run hyperparameter search
"""

import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
import xgboost as xgb

# ── Paths ──────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PKG_DIR = SCRIPT_DIR.parent
DATA_DIR = PKG_DIR / "data"
MODEL_DIR = PKG_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

DEFAULT_INPUT = DATA_DIR / "training_data.csv"
MODEL_PATH = MODEL_DIR / "xgboost_model.json"
IMPORTANCE_PATH = MODEL_DIR / "feature_importance.png"
SCATTER_PATH = MODEL_DIR / "predicted_vs_actual.png"
REPORT_PATH = MODEL_DIR / "training_report.json"

# Features the model trains on — must match production inference inputs
FEATURE_COLS = [
    "Baseline_Wind",
    "Pressure_Gradient",
    "Thermal_Delta",
    "Hour_of_Day",
    "Month",
    "Wind_Direction",
    "Temperature",
    "Wind_Gust_Baseline",
    "Is_Thermal_Window",
    "Wind_Dir_Sin",
    "Wind_Dir_Cos",
    "Hour_Sin",
    "Hour_Cos",
    "HRRR_Temp",
    "Temp_Model_Delta",
]

TARGET_COL = "Wind_Error"


# ═══════════════════════════════════════════════════════════════════════════
# 1.  LOAD & SPLIT
# ═══════════════════════════════════════════════════════════════════════════

def load_dataset(path: Path) -> pd.DataFrame:
    """Load prepared CSV and validate required columns."""
    print(f"[1/4] Loading dataset from {path.name} ...")
    df = pd.read_csv(path, parse_dates=["hour"])
    df = df.sort_values("hour").reset_index(drop=True)

    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    available = [c for c in FEATURE_COLS if c in df.columns]
    df = df.dropna(subset=available + [TARGET_COL])

    print(f"  -> {len(df):,} rows, {len(available)} features")
    print(f"  -> Date range: {df['hour'].min()} - {df['hour'].max()}")
    return df


def chronological_split(df: pd.DataFrame, test_frac: float = 0.20):
    """
    Split data chronologically to prevent future data leakage.
    The last `test_frac` of rows (by time) become the test set.
    """
    split_idx = int(len(df) * (1 - test_frac))
    train = df.iloc[:split_idx].copy()
    test = df.iloc[split_idx:].copy()

    print(f"  -> Train: {len(train):,} rows ({train['hour'].min().date()} - {train['hour'].max().date()})")
    print(f"  -> Test:  {len(test):,} rows  ({test['hour'].min().date()} - {test['hour'].max().date()})")
    return train, test


# ═══════════════════════════════════════════════════════════════════════════
# 2.  TRAIN
# ═══════════════════════════════════════════════════════════════════════════

def train_model(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    tune: bool = False,
) -> tuple[xgb.XGBRegressor, dict]:
    """Train XGBoost regressor and return (model, metrics)."""
    print("[2/4] Training XGBoost regressor ...")

    available = [c for c in FEATURE_COLS if c in train_df.columns]

    X_train = train_df[available]
    y_train = train_df[TARGET_COL]
    X_test = test_df[available]
    y_test = test_df[TARGET_COL]

    base_params = {
        "n_estimators": 500,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 5,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "random_state": 42,
        "n_jobs": -1,
        "early_stopping_rounds": 30,
    }

    if tune:
        print("  Running TimeSeriesSplit cross-validation ...")
        best_score = float("inf")
        best_params = {}
        tscv = TimeSeriesSplit(n_splits=3)

        for lr in [0.01, 0.03, 0.05, 0.1]:
            for depth in [4, 6, 8]:
                params = {**base_params, "learning_rate": lr, "max_depth": depth}
                scores = []
                for train_idx, val_idx in tscv.split(X_train):
                    Xt, Xv = X_train.iloc[train_idx], X_train.iloc[val_idx]
                    yt, yv = y_train.iloc[train_idx], y_train.iloc[val_idx]

                    m = xgb.XGBRegressor(**params)
                    m.fit(Xt, yt, eval_set=[(Xv, yv)], verbose=False)
                    pred = m.predict(Xv)
                    scores.append(mean_absolute_error(yv, pred))

                avg = np.mean(scores)
                if avg < best_score:
                    best_score = avg
                    best_params = {"learning_rate": lr, "max_depth": depth}

        print(f"  Best CV params: lr={best_params['learning_rate']}, depth={best_params['max_depth']}")
        base_params.update(best_params)

    model = xgb.XGBRegressor(**base_params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    metrics = {
        "train_mae": round(mean_absolute_error(y_train, y_pred_train), 3),
        "train_rmse": round(np.sqrt(mean_squared_error(y_train, y_pred_train)), 3),
        "train_r2": round(r2_score(y_train, y_pred_train), 4),
        "test_mae": round(mean_absolute_error(y_test, y_pred_test), 3),
        "test_rmse": round(np.sqrt(mean_squared_error(y_test, y_pred_test)), 3),
        "test_r2": round(r2_score(y_test, y_pred_test), 4),
        "n_train": len(train_df),
        "n_test": len(test_df),
        "n_features": len(available),
        "features": available,
        "best_iteration": model.best_iteration if hasattr(model, "best_iteration") else None,
    }

    print(f"\n  +-------------------------------------------+")
    print(f"  |  TRAINING RESULTS                         |")
    print(f"  +-------------------------------------------+")
    print(f"  |  Train MAE:  {metrics['train_mae']:>8.3f} mph              |")
    print(f"  |  Train RMSE: {metrics['train_rmse']:>8.3f} mph              |")
    print(f"  |  Train R2:   {metrics['train_r2']:>8.4f}                  |")
    print(f"  |                                           |")
    print(f"  |  Test MAE:   {metrics['test_mae']:>8.3f} mph              |")
    print(f"  |  Test RMSE:  {metrics['test_rmse']:>8.3f} mph              |")
    print(f"  |  Test R2:    {metrics['test_r2']:>8.4f}                  |")
    print(f"  +-------------------------------------------+")

    return model, metrics, y_pred_test


# ═══════════════════════════════════════════════════════════════════════════
# 3.  FEATURE IMPORTANCE
# ═══════════════════════════════════════════════════════════════════════════

def plot_feature_importance(model: xgb.XGBRegressor, output_path: Path):
    """Save a horizontal bar chart of XGBoost feature importances."""
    print(f"[3/4] Plotting feature importance -> {output_path.name}")

    importance = model.get_booster().get_score(importance_type="gain")
    sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)

    if not sorted_imp:
        print("  WARN: No feature importances available")
        return

    names = [x[0] for x in sorted_imp]
    values = [x[1] for x in sorted_imp]

    fig, ax = plt.subplots(figsize=(10, max(4, len(names) * 0.4)))
    y_pos = range(len(names))
    bars = ax.barh(y_pos, values, color="#3b82f6", edgecolor="#1e3a5f")
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=10)
    ax.invert_yaxis()
    ax.set_xlabel("Gain (avg loss reduction per split)", fontsize=11)
    ax.set_title("XGBoost Feature Importance — Utah Lake Wind Error Predictor", fontsize=13, fontweight="bold")
    ax.grid(axis="x", alpha=0.3)

    # Annotate top 3
    for i, (bar, val) in enumerate(zip(bars[:3], values[:3])):
        ax.text(val + max(values) * 0.01, bar.get_y() + bar.get_height() / 2,
                f"{val:.0f}", va="center", fontsize=9, fontweight="bold")

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()

    print("  Top 5 features by gain:")
    for name, val in sorted_imp[:5]:
        pct = val / sum(values) * 100
        print(f"    {name:<25s}  gain={val:>8.1f}  ({pct:.1f}%)")


def plot_predicted_vs_actual(y_true, y_pred, output_path: Path):
    """Scatter plot of predicted vs actual Wind_Error."""
    print(f"  Plotting predicted vs actual -> {output_path.name}")

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(y_true, y_pred, alpha=0.3, s=8, c="#3b82f6", edgecolors="none")

    lims = [min(y_true.min(), y_pred.min()) - 1, max(y_true.max(), y_pred.max()) + 1]
    ax.plot(lims, lims, "r--", linewidth=1, label="Perfect prediction")
    ax.set_xlim(lims)
    ax.set_ylim(lims)
    ax.set_xlabel("Actual Wind Error (mph)", fontsize=11)
    ax.set_ylabel("Predicted Wind Error (mph)", fontsize=11)
    ax.set_title("Predicted vs Actual — Test Set", fontsize=13, fontweight="bold")
    ax.legend()
    ax.grid(alpha=0.3)
    ax.set_aspect("equal")

    plt.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


# ═══════════════════════════════════════════════════════════════════════════
# 4.  EXPORT
# ═══════════════════════════════════════════════════════════════════════════

def export_model(model: xgb.XGBRegressor, metrics: dict):
    """Save the trained model as JSON and write a training report."""
    print(f"[4/4] Exporting model -> {MODEL_PATH.name}")

    model.save_model(str(MODEL_PATH))
    size_kb = MODEL_PATH.stat().st_size / 1024
    print(f"  -> Model size: {size_kb:.0f} KB")

    with open(REPORT_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  -> Training report -> {REPORT_PATH.name}")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Train XGBoost Wind_Error predictor")
    parser.add_argument("--input", type=str, default=str(DEFAULT_INPUT))
    parser.add_argument("--tune", action="store_true", help="Run hyperparameter search")
    parser.add_argument("--test-frac", type=float, default=0.20, help="Test set fraction")
    args = parser.parse_args()

    df = load_dataset(Path(args.input))
    train_df, test_df = chronological_split(df, args.test_frac)

    model, metrics, y_pred_test = train_model(train_df, test_df, tune=args.tune)

    plot_feature_importance(model, IMPORTANCE_PATH)
    plot_predicted_vs_actual(
        test_df[TARGET_COL].values,
        y_pred_test,
        SCATTER_PATH,
    )

    export_model(model, metrics)

    print("\n" + "=" * 50)
    print("  PIPELINE COMPLETE")
    print("=" * 50)
    print(f"  Model:       {MODEL_PATH.name}")
    print(f"  Importance:  {IMPORTANCE_PATH.name}")
    print(f"  Scatter:     {SCATTER_PATH.name}")
    print(f"  Report:      {REPORT_PATH.name}")
    print(f"\n  Test MAE: {metrics['test_mae']:.3f} mph")
    print(f"  Test R2:  {metrics['test_r2']:.4f}")
    print(f"\n  To use in production:")
    print(f"    import {{ predict, loadModel }} from '@utahwind/ml';")
    print(f"    await loadModel('models/xgboost_model.json');")
    print(f"    const correction = predict({{ Baseline_Wind: 8, ... }});")


if __name__ == "__main__":
    main()
