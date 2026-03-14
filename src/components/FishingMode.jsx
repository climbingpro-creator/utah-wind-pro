import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Fish, Moon, Thermometer, Gauge, Clock, MapPin, TrendingUp, TrendingDown, Minus, Sun, Sunset, CloudRain, Wind, Waves, Calendar, Target, AlertTriangle, CheckCircle, Anchor, Navigation, Egg, Mountain, Brain, Zap, Droplets } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { predictFishing } from '../services/FishingPredictor';
import { getWaterTemp, getAllWaterTemps } from '../services/USGSWaterService';
import WaterForecast from './WaterForecast';

// Utah Fishing Locations Configuration
export const FISHING_LOCATIONS = {
  'strawberry': {
    id: 'strawberry',
    name: 'Strawberry Reservoir',
    region: 'Wasatch',
    elevation: 7600,
    coordinates: { lat: 40.1717, lng: -111.1847 },
    type: 'reservoir',
    species: ['Rainbow Trout', 'Cutthroat Trout', 'Kokanee Salmon'],
    primarySpecies: 'Cutthroat Trout',
    bestMonths: [5, 6, 9, 10],
    iceOff: 'Mid-May',
    depths: {
      spring: { min: 5, max: 20, description: 'Shallow flats after ice-off' },
      summer: { min: 20, max: 50, description: 'Thermocline depth' },
      fall: { min: 10, max: 30, description: 'Following baitfish' },
      winter: { min: 15, max: 40, description: 'Ice fishing depths' },
    },
    spawning: {
      'Cutthroat Trout': { months: [5, 6], location: 'Tributary streams', behavior: 'Run up Strawberry River and Indian Creek' },
      'Rainbow Trout': { months: [4, 5], location: 'Inlet streams', behavior: 'Spawn in flowing water' },
      'Kokanee Salmon': { months: [9, 10], location: 'Tributary mouths', behavior: 'Turn red, stage near inlets' },
    },
    structure: [
      { type: 'Weed Beds', description: 'Submerged vegetation in 10-20 ft', bestFor: ['Cutthroat Trout', 'Rainbow Trout'] },
      { type: 'Drop-offs', description: 'Ledges from 15-40 ft', bestFor: ['Cutthroat Trout', 'Kokanee Salmon'] },
      { type: 'Inlet Areas', description: 'Where streams enter', bestFor: ['Rainbow Trout', 'Cutthroat Trout'] },
      { type: 'Rocky Points', description: 'Submerged rock piles', bestFor: ['Cutthroat Trout'] },
    ],
    hotspots: [
      { name: 'Soldier Creek Arm', description: 'Most productive area, tube jigs work great', species: ['Cutthroat Trout', 'Rainbow Trout'], coordinates: { lat: 40.165, lng: -111.145 } },
      { name: 'Strawberry Bay', description: 'Easy access, good shore fishing', species: ['Rainbow Trout', 'Cutthroat Trout'], coordinates: { lat: 40.178, lng: -111.195 } },
      { name: 'Chicken Creek Arm', description: 'Less pressure, quality fish', species: ['Cutthroat Trout'], coordinates: { lat: 40.155, lng: -111.225 } },
      { name: 'Indian Creek Inlet', description: 'Spring spawning run hotspot', species: ['Cutthroat Trout', 'Rainbow Trout'], coordinates: { lat: 40.142, lng: -111.168 } },
    ],
    regulations: 'Cutthroat: 15" minimum, 4 fish limit',
    tips: 'Soldier Creek arm is most productive. Use tube jigs tipped with worm.',
  },
  'flaming-gorge': {
    id: 'flaming-gorge',
    name: 'Flaming Gorge',
    region: 'Daggett',
    elevation: 6040,
    coordinates: { lat: 41.0917, lng: -109.5417 },
    type: 'reservoir',
    species: ['Lake Trout', 'Rainbow Trout', 'Kokanee Salmon', 'Smallmouth Bass'],
    primarySpecies: 'Lake Trout',
    bestMonths: [4, 5, 10, 11],
    depths: {
      spring: { min: 20, max: 60, description: 'Lakers near surface' },
      summer: { min: 70, max: 120, description: 'Deep water structure' },
      fall: { min: 40, max: 80, description: 'Following kokanee spawn' },
      winter: { min: 60, max: 100, description: 'Deep ledges' },
    },
    spawning: {
      'Lake Trout': { months: [10, 11], location: 'Rocky shoals 40-80 ft', behavior: 'Spawn on underwater rock structure' },
      'Kokanee Salmon': { months: [9, 10], location: 'Sheep Creek, tributaries', behavior: 'Run up streams, turn bright red' },
      'Smallmouth Bass': { months: [5, 6], location: 'Rocky shallows 5-15 ft', behavior: 'Males guard nests on gravel' },
      'Rainbow Trout': { months: [4, 5], location: 'Inlet streams', behavior: 'Spawn in flowing water' },
    },
    structure: [
      { type: 'Deep Ledges', description: 'Underwater cliffs 60-120 ft', bestFor: ['Lake Trout'] },
      { type: 'Submerged Humps', description: 'Underwater hills rising from deep water', bestFor: ['Lake Trout', 'Kokanee Salmon'] },
      { type: 'Rocky Points', description: 'Shoreline points with rock substrate', bestFor: ['Smallmouth Bass', 'Rainbow Trout'] },
      { type: 'Canyon Walls', description: 'Steep underwater walls', bestFor: ['Lake Trout'] },
    ],
    hotspots: [
      { name: 'Sheep Creek Bay', description: 'Kokanee staging area, fall hotspot', species: ['Kokanee Salmon', 'Lake Trout'], coordinates: { lat: 41.015, lng: -109.685 } },
      { name: 'Antelope Flat', description: 'Trophy lake trout water', species: ['Lake Trout'], coordinates: { lat: 41.045, lng: -109.545 } },
      { name: 'Lucerne Marina Area', description: 'Good access, consistent fishing', species: ['Rainbow Trout', 'Lake Trout'], coordinates: { lat: 41.035, lng: -109.575 } },
      { name: 'Jarvies Canyon', description: 'Deep water structure, big lakers', species: ['Lake Trout'], coordinates: { lat: 41.085, lng: -109.495 } },
      { name: 'Linwood Bay', description: 'Excellent smallmouth bass', species: ['Smallmouth Bass'], coordinates: { lat: 41.065, lng: -109.625 } },
    ],
    regulations: 'Lake trout: 8 fish limit, only 1 over 28"',
    tips: 'Trophy lake trout over 50 lbs possible. Use downriggers in summer.',
  },
  'deer-creek': {
    id: 'deer-creek',
    name: 'Deer Creek Reservoir',
    region: 'Wasatch',
    elevation: 5417,
    coordinates: { lat: 40.4067, lng: -111.5217 },
    type: 'reservoir',
    species: ['Rainbow Trout', 'Brown Trout', 'Largemouth Bass', 'Walleye', 'Yellow Perch'],
    primarySpecies: 'Walleye',
    bestMonths: [4, 5, 6, 9, 10],
    depths: {
      spring: { min: 8, max: 25, description: 'Walleye spawning flats' },
      summer: { min: 20, max: 45, description: 'Main lake points' },
      fall: { min: 15, max: 35, description: 'Following shad' },
      winter: { min: 25, max: 50, description: 'Deep structure' },
    },
    spawning: {
      'Walleye': { months: [3, 4], location: 'Rocky flats 8-15 ft', behavior: 'Night spawning on gravel/rock' },
      'Largemouth Bass': { months: [5, 6], location: 'Shallow coves 3-8 ft', behavior: 'Males fan out nests in soft bottom' },
      'Yellow Perch': { months: [4, 5], location: 'Weedy shallows', behavior: 'Spawn in vegetation' },
      'Brown Trout': { months: [10, 11], location: 'Provo River inlet', behavior: 'Run up river to spawn' },
    },
    structure: [
      { type: 'Main Lake Points', description: 'Rocky points extending into deep water', bestFor: ['Walleye', 'Brown Trout'] },
      { type: 'Weed Beds', description: 'Submerged vegetation in coves', bestFor: ['Largemouth Bass', 'Yellow Perch'] },
      { type: 'Dam Face', description: 'Steep rocky structure near dam', bestFor: ['Walleye', 'Rainbow Trout'] },
      { type: 'River Channel', description: 'Old Provo River channel', bestFor: ['Walleye', 'Brown Trout'] },
    ],
    hotspots: [
      { name: 'Dam Area', description: 'Night walleye hotspot, deep water access', species: ['Walleye', 'Rainbow Trout'], coordinates: { lat: 40.395, lng: -111.525 } },
      { name: 'Wallsburg Bay', description: 'Good bass and perch fishing', species: ['Largemouth Bass', 'Yellow Perch'], coordinates: { lat: 40.425, lng: -111.485 } },
      { name: 'Charleston Inlet', description: 'Trout staging area', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.445, lng: -111.465 } },
      { name: 'Island Area', description: 'Structure-rich, multiple species', species: ['Walleye', 'Largemouth Bass'], coordinates: { lat: 40.415, lng: -111.505 } },
    ],
    regulations: 'Walleye: 6 fish limit, only 1 over 24"',
    tips: 'Night fishing for walleye is excellent. Try the dam area.',
  },
  'provo-river': {
    id: 'provo-river',
    name: 'Provo River',
    region: 'Wasatch/Utah',
    elevation: 5500,
    coordinates: { lat: 40.3267, lng: -111.6017 },
    type: 'river',
    species: ['Brown Trout', 'Rainbow Trout', 'Cutthroat Trout', 'Mountain Whitefish'],
    primarySpecies: 'Brown Trout',
    bestMonths: [3, 4, 5, 9, 10, 11],
    sections: {
      upper: { description: 'Above Jordanelle - smaller fish, less pressure' },
      middle: { description: 'Jordanelle to Deer Creek - good access' },
      lower: { description: 'Below Deer Creek - trophy water, 2500+ fish/mile' },
    },
    spawning: {
      'Brown Trout': { months: [10, 11], location: 'Gravel runs throughout', behavior: 'Aggressive pre-spawn, build redds in gravel' },
      'Rainbow Trout': { months: [3, 4, 5], location: 'Gravel riffles', behavior: 'Spring spawners, look for paired fish' },
      'Mountain Whitefish': { months: [10, 11], location: 'Deep pools', behavior: 'Spawn in deeper water' },
    },
    structure: [
      { type: 'Riffles', description: 'Fast shallow water over gravel', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Deep Pools', description: 'Slow deep sections', bestFor: ['Brown Trout', 'Mountain Whitefish'] },
      { type: 'Undercut Banks', description: 'Eroded banks with cover', bestFor: ['Brown Trout'] },
      { type: 'Log Jams', description: 'Woody debris structure', bestFor: ['Brown Trout', 'Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'Lower Section (Below Deer Creek)', description: 'Trophy water, 2500+ fish/mile', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.355, lng: -111.585 } },
      { name: 'Midway Area', description: 'Good access, consistent hatches', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.515, lng: -111.475 } },
      { name: 'Deer Creek Tailwater', description: 'Cold water, year-round fishing', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.385, lng: -111.545 } },
      { name: 'Olmstead Diversion', description: 'Classic dry fly water', species: ['Brown Trout'], coordinates: { lat: 40.335, lng: -111.615 } },
    ],
    regulations: 'Lower section: Artificial flies/lures only, catch & release',
    tips: 'Blue Winged Olive hatches in March-May. Match the hatch!',
  },
  'green-river': {
    id: 'green-river',
    name: 'Green River',
    region: 'Daggett',
    elevation: 5600,
    coordinates: { lat: 40.9117, lng: -109.4217 },
    type: 'river',
    species: ['Rainbow Trout', 'Brown Trout', 'Cutthroat Trout'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [3, 4, 5, 9, 10],
    sections: {
      a: { description: 'Dam to Little Hole - 7 miles, most popular' },
      b: { description: 'Little Hole to Indian Crossing - 9 miles, technical' },
      c: { description: 'Indian Crossing to Ouray - remote, big fish' },
    },
    spawning: {
      'Rainbow Trout': { months: [3, 4, 5], location: 'Gravel bars A & B sections', behavior: 'Spring spawners, aggressive feeders' },
      'Brown Trout': { months: [10, 11], location: 'Throughout river', behavior: 'Fall spawners, territorial' },
      'Cutthroat Trout': { months: [5, 6], location: 'Upper sections', behavior: 'Late spring spawners' },
    },
    structure: [
      { type: 'Tailouts', description: 'End of pools where water speeds up', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Seams', description: 'Current breaks between fast/slow water', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Boulders', description: 'Large rocks creating eddies', bestFor: ['Brown Trout'] },
      { type: 'Weed Beds', description: 'Aquatic vegetation', bestFor: ['Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'Little Hole', description: 'Classic access point, consistent fishing', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.905, lng: -109.395 } },
      { name: 'Red Creek Rapids', description: 'Technical water, big fish', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.875, lng: -109.365 } },
      { name: 'Grasshopper Flats', description: 'Summer terrestrial fishing', species: ['Rainbow Trout'], coordinates: { lat: 40.895, lng: -109.385 } },
      { name: 'Browns Park', description: 'Remote, trophy browns', species: ['Brown Trout'], coordinates: { lat: 40.825, lng: -109.025 } },
    ],
    regulations: 'A Section: 3 trout limit, 1 over 20"',
    tips: 'World-class tailwater. Cicada hatch in June is legendary.',
  },
  'utah-lake': {
    id: 'utah-lake',
    name: 'Utah Lake',
    region: 'Utah',
    elevation: 4489,
    coordinates: { lat: 40.2167, lng: -111.7917 },
    type: 'lake',
    species: ['Channel Catfish', 'White Bass', 'Walleye', 'Largemouth Bass', 'Black Crappie'],
    primarySpecies: 'Channel Catfish',
    bestMonths: [5, 6, 7, 8, 9],
    depths: {
      spring: { min: 4, max: 12, description: 'Warming shallows' },
      summer: { min: 6, max: 14, description: 'Max depth ~14 ft' },
      fall: { min: 5, max: 12, description: 'Cooling flats' },
    },
    spawning: {
      'White Bass': { months: [5, 6], location: 'Tributary mouths, Provo River', behavior: 'Massive spawning runs up rivers' },
      'Channel Catfish': { months: [6, 7], location: 'Rocky areas, rip-rap', behavior: 'Males guard eggs in cavities' },
      'Largemouth Bass': { months: [5, 6], location: 'Shallow coves 2-6 ft', behavior: 'Nest builders in soft bottom' },
      'Black Crappie': { months: [5, 6], location: 'Brush piles, marinas', behavior: 'Spawn around structure' },
      'Walleye': { months: [3, 4], location: 'Rocky shorelines', behavior: 'Night spawners on hard bottom' },
    },
    structure: [
      { type: 'Marina Docks', description: 'Shade and structure', bestFor: ['Largemouth Bass', 'Black Crappie'] },
      { type: 'Rip-rap', description: 'Rocky shoreline protection', bestFor: ['Channel Catfish', 'White Bass'] },
      { type: 'River Mouths', description: 'Where rivers enter lake', bestFor: ['White Bass', 'Channel Catfish'] },
      { type: 'Weed Lines', description: 'Edge of vegetation', bestFor: ['Largemouth Bass', 'Black Crappie'] },
    ],
    hotspots: [
      { name: 'Lincoln Beach Marina', description: 'Year-round catfish, white bass run', species: ['Channel Catfish', 'White Bass'], coordinates: { lat: 40.144, lng: -111.802 } },
      { name: 'Provo River Inlet', description: 'White bass spawning run hotspot', species: ['White Bass', 'Channel Catfish'], coordinates: { lat: 40.235, lng: -111.725 } },
      { name: 'American Fork Marina', description: 'Good bass and crappie', species: ['Largemouth Bass', 'Black Crappie'], coordinates: { lat: 40.345, lng: -111.795 } },
      { name: 'Pelican Point', description: 'Walleye and catfish', species: ['Walleye', 'Channel Catfish'], coordinates: { lat: 40.185, lng: -111.875 } },
      { name: 'Spanish Fork River Inlet', description: 'Spring white bass run', species: ['White Bass'], coordinates: { lat: 40.115, lng: -111.715 } },
    ],
    regulations: 'Catfish: No limit. Carp bow fishing allowed.',
    tips: 'White bass run in May is incredible. Lincoln Beach marina area.',
  },
  'jordanelle': {
    id: 'jordanelle',
    name: 'Jordanelle Reservoir',
    region: 'Wasatch',
    elevation: 6166,
    coordinates: { lat: 40.6017, lng: -111.4217 },
    type: 'reservoir',
    species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass', 'Yellow Perch'],
    primarySpecies: 'Smallmouth Bass',
    bestMonths: [5, 6, 7, 8, 9],
    depths: {
      spring: { min: 8, max: 20, description: 'Bass moving shallow' },
      summer: { min: 15, max: 35, description: 'Rocky points' },
      fall: { min: 10, max: 25, description: 'Following baitfish' },
    },
    spawning: {
      'Smallmouth Bass': { months: [5, 6], location: 'Rocky flats 5-12 ft', behavior: 'Males guard nests aggressively' },
      'Yellow Perch': { months: [4, 5], location: 'Weedy shallows', behavior: 'Spawn in vegetation' },
      'Rainbow Trout': { months: [4, 5], location: 'Provo River inlet', behavior: 'Run up tributary' },
      'Brown Trout': { months: [10, 11], location: 'Provo River inlet', behavior: 'Fall spawning run' },
    },
    structure: [
      { type: 'Rocky Points', description: 'Main lake points with rock substrate', bestFor: ['Smallmouth Bass', 'Rainbow Trout'] },
      { type: 'Submerged Road Beds', description: 'Old roads now underwater', bestFor: ['Smallmouth Bass', 'Yellow Perch'] },
      { type: 'Standing Timber', description: 'Flooded trees in arms', bestFor: ['Yellow Perch', 'Brown Trout'] },
      { type: 'Dam Face', description: 'Deep rocky structure', bestFor: ['Rainbow Trout', 'Brown Trout'] },
    ],
    hotspots: [
      { name: 'Rock Cliff Recreation Area', description: 'Excellent smallmouth, easy access', species: ['Smallmouth Bass', 'Yellow Perch'], coordinates: { lat: 40.615, lng: -111.395 } },
      { name: 'Hailstone Marina', description: 'Good trout fishing, boat access', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.585, lng: -111.435 } },
      { name: 'Provo River Arm', description: 'Trout staging, fall browns', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.635, lng: -111.385 } },
      { name: 'Ross Creek Arm', description: 'Less pressure, quality bass', species: ['Smallmouth Bass'], coordinates: { lat: 40.595, lng: -111.415 } },
    ],
    regulations: 'Bass: 6 fish limit',
    tips: 'Excellent smallmouth fishery. Drop shot on rocky points.',
  },
  'pineview': {
    id: 'pineview',
    name: 'Pineview Reservoir',
    region: 'Weber',
    elevation: 4900,
    coordinates: { lat: 41.2567, lng: -111.8417 },
    type: 'reservoir',
    species: ['Tiger Muskie', 'Largemouth Bass', 'Crappie', 'Yellow Perch', 'Rainbow Trout'],
    primarySpecies: 'Tiger Muskie',
    bestMonths: [5, 6, 9, 10],
    depths: {
      spring: { min: 5, max: 15, description: 'Muskie in shallows' },
      summer: { min: 15, max: 30, description: 'Weed edges' },
      fall: { min: 10, max: 25, description: 'Pre-winter feed' },
    },
    spawning: {
      'Tiger Muskie': { months: [0], location: 'N/A - Sterile hybrid', behavior: 'Does not spawn (stocked only)' },
      'Largemouth Bass': { months: [5, 6], location: 'Shallow coves 3-8 ft', behavior: 'Nest builders in soft bottom' },
      'Crappie': { months: [5, 6], location: 'Brush piles, docks', behavior: 'Spawn around woody structure' },
      'Yellow Perch': { months: [4, 5], location: 'Weedy shallows', behavior: 'Spawn in vegetation' },
    },
    structure: [
      { type: 'Weed Beds', description: 'Extensive aquatic vegetation', bestFor: ['Tiger Muskie', 'Largemouth Bass'] },
      { type: 'Docks/Marinas', description: 'Man-made structure', bestFor: ['Crappie', 'Largemouth Bass'] },
      { type: 'Points', description: 'Shoreline points', bestFor: ['Tiger Muskie', 'Yellow Perch'] },
      { type: 'Creek Channels', description: 'Old creek beds', bestFor: ['Crappie', 'Yellow Perch'] },
    ],
    hotspots: [
      { name: 'Cemetery Point', description: 'Prime muskie water, weed edges', species: ['Tiger Muskie', 'Largemouth Bass'], coordinates: { lat: 41.265, lng: -111.825 } },
      { name: 'Anderson Cove', description: 'Good bass and crappie', species: ['Largemouth Bass', 'Crappie'], coordinates: { lat: 41.245, lng: -111.855 } },
      { name: 'Middle Inlet Arm', description: 'Muskie cruising area', species: ['Tiger Muskie'], coordinates: { lat: 41.275, lng: -111.815 } },
      { name: 'Dam Area', description: 'Deep water, trout and perch', species: ['Rainbow Trout', 'Yellow Perch'], coordinates: { lat: 41.235, lng: -111.875 } },
    ],
    regulations: 'Tiger Muskie: Catch & release only',
    tips: 'State record muskie water. Large swimbaits and jerkbaits.',
  },
};

// Fish Species Data
const FISH_SPECIES = {
  'Rainbow Trout': { tempOptimal: [55, 65], tempStress: 70, icon: '🌈', color: 'text-pink-400' },
  'Brown Trout': { tempOptimal: [60, 70], tempStress: 75, icon: '🟤', color: 'text-amber-600' },
  'Cutthroat Trout': { tempOptimal: [39, 59], tempStress: 68, icon: '🔴', color: 'text-red-400' },
  'Lake Trout': { tempOptimal: [42, 55], tempStress: 65, icon: '⬛', color: 'text-slate-400' },
  'Kokanee Salmon': { tempOptimal: [50, 59], tempStress: 65, icon: '🔶', color: 'text-orange-400' },
  'Largemouth Bass': { tempOptimal: [68, 78], tempStress: 85, icon: '🐟', color: 'text-green-500' },
  'Smallmouth Bass': { tempOptimal: [65, 75], tempStress: 80, icon: '🐟', color: 'text-emerald-500' },
  'Walleye': { tempOptimal: [65, 70], tempStress: 80, icon: '👁️', color: 'text-yellow-400' },
  'Channel Catfish': { tempOptimal: [65, 76], tempStress: 90, icon: '🐱', color: 'text-slate-500' },
  'Yellow Perch': { tempOptimal: [63, 72], tempStress: 78, icon: '🟡', color: 'text-yellow-500' },
  'Tiger Muskie': { tempOptimal: [60, 70], tempStress: 80, icon: '🐯', color: 'text-orange-500' },
  'White Bass': { tempOptimal: [65, 75], tempStress: 85, icon: '⚪', color: 'text-slate-300' },
  'Black Crappie': { tempOptimal: [60, 70], tempStress: 80, icon: '⚫', color: 'text-slate-600' },
  'Mountain Whitefish': { tempOptimal: [45, 55], tempStress: 65, icon: '🐟', color: 'text-blue-300' },
};

// Moon Phase Calculations
function getMoonPhase(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.53058867;
  const phaseIndex = phase - Math.floor(phase);
  
  if (phaseIndex < 0.0625) return { name: 'New Moon', icon: '🌑', rating: 5, description: 'Excellent - Major feeding period' };
  if (phaseIndex < 0.1875) return { name: 'Waxing Crescent', icon: '🌒', rating: 3, description: 'Good - Increasing activity' };
  if (phaseIndex < 0.3125) return { name: 'First Quarter', icon: '🌓', rating: 4, description: 'Good - Minor feeding period' };
  if (phaseIndex < 0.4375) return { name: 'Waxing Gibbous', icon: '🌔', rating: 3, description: 'Fair - Moderate activity' };
  if (phaseIndex < 0.5625) return { name: 'Full Moon', icon: '🌕', rating: 5, description: 'Excellent - Major feeding period' };
  if (phaseIndex < 0.6875) return { name: 'Waning Gibbous', icon: '🌖', rating: 3, description: 'Fair - Night feeding' };
  if (phaseIndex < 0.8125) return { name: 'Last Quarter', icon: '🌗', rating: 4, description: 'Good - Minor feeding period' };
  if (phaseIndex < 0.9375) return { name: 'Waning Crescent', icon: '🌘', rating: 3, description: 'Good - Pre-new moon activity' };
  return { name: 'New Moon', icon: '🌑', rating: 5, description: 'Excellent - Major feeding period' };
}

// Solunar Calculations (simplified)
function getSolunarPeriods(date = new Date()) {
  const moonPhase = getMoonPhase(date);
  const hour = date.getHours();
  
  // Simplified major/minor periods based on typical patterns
  const majorPeriods = [
    { start: 5, end: 7, type: 'major', label: 'Dawn Major' },
    { start: 17, end: 19, type: 'major', label: 'Dusk Major' },
  ];
  
  const minorPeriods = [
    { start: 11, end: 12, type: 'minor', label: 'Midday Minor' },
    { start: 23, end: 24, type: 'minor', label: 'Midnight Minor' },
  ];
  
  const currentPeriod = [...majorPeriods, ...minorPeriods].find(
    p => hour >= p.start && hour < p.end
  );
  
  return {
    major: majorPeriods,
    minor: minorPeriods,
    current: currentPeriod,
    moonPhase,
  };
}

// Barometric Pressure Analysis
function analyzePressure(pressure, trend) {
  if (!pressure) return { rating: 0, message: 'No data', color: 'text-slate-400' };
  
  let rating = 3;
  let message = '';
  let color = 'text-yellow-400';
  
  // Optimal range: 29.80 - 30.20 inHg
  if (pressure >= 29.80 && pressure <= 30.20) {
    rating = 5;
    message = 'Optimal pressure range';
    color = 'text-green-400';
  } else if (pressure < 29.70) {
    rating = 2;
    message = 'Low pressure - fish may be deep';
    color = 'text-orange-400';
  } else if (pressure > 30.50) {
    rating = 2;
    message = 'High pressure - tough fishing';
    color = 'text-blue-400';
  } else {
    rating = 3;
    message = 'Moderate pressure';
    color = 'text-yellow-400';
  }
  
  // Trend adjustments
  if (trend === 'falling') {
    rating = Math.min(5, rating + 1);
    message += ' - FALLING (fish feeding!)';
    color = 'text-green-400';
  } else if (trend === 'rising') {
    rating = Math.max(1, rating - 1);
    message += ' - Rising (slowing activity)';
  }
  
  return { rating, message, color };
}

// Calculate overall fishing score
function calculateFishingScore(location, conditions) {
  const { pressure, pressureTrend, windSpeed, waterTemp, moonPhase, hour } = conditions;
  
  let score = 50; // Base score
  let factors = [];
  
  // Moon phase (0-20 points)
  const moonScore = (moonPhase?.rating || 3) * 4;
  score += moonScore - 12;
  factors.push({ name: 'Moon Phase', value: moonPhase?.name, impact: moonScore >= 16 ? 'positive' : moonScore <= 8 ? 'negative' : 'neutral' });
  
  // Barometric pressure (0-20 points)
  const pressureAnalysis = analyzePressure(pressure, pressureTrend);
  const pressureScore = pressureAnalysis.rating * 4;
  score += pressureScore - 12;
  factors.push({ name: 'Pressure', value: `${pressure?.toFixed(2) || '--'} inHg`, impact: pressureScore >= 16 ? 'positive' : pressureScore <= 8 ? 'negative' : 'neutral' });
  
  // Time of day (0-15 points)
  const isGoldenHour = (hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20);
  const isMidDay = hour >= 11 && hour <= 14;
  const timeScore = isGoldenHour ? 15 : isMidDay ? 5 : 10;
  score += timeScore - 10;
  factors.push({ name: 'Time of Day', value: isGoldenHour ? 'Golden Hour' : isMidDay ? 'Midday' : 'Moderate', impact: isGoldenHour ? 'positive' : isMidDay ? 'negative' : 'neutral' });
  
  // Wind (0-15 points)
  let windScore = 10;
  if (windSpeed < 5) windScore = 12;
  else if (windSpeed < 10) windScore = 15; // Light wind is ideal
  else if (windSpeed < 15) windScore = 10;
  else if (windSpeed < 20) windScore = 5;
  else windScore = 2;
  score += windScore - 10;
  factors.push({ name: 'Wind', value: `${windSpeed?.toFixed(0) || '--'} mph`, impact: windScore >= 12 ? 'positive' : windScore <= 5 ? 'negative' : 'neutral' });
  
  // Water temperature (species dependent, 0-15 points)
  const locationData = FISHING_LOCATIONS[location];
  if (locationData && waterTemp) {
    const primarySpecies = FISH_SPECIES[locationData.primarySpecies];
    if (primarySpecies) {
      const [optMin, optMax] = primarySpecies.tempOptimal;
      let tempScore = 8;
      if (waterTemp >= optMin && waterTemp <= optMax) {
        tempScore = 15;
      } else if (waterTemp < optMin - 10 || waterTemp > primarySpecies.tempStress) {
        tempScore = 3;
      }
      score += tempScore - 10;
      factors.push({ name: 'Water Temp', value: `${waterTemp}°F`, impact: tempScore >= 12 ? 'positive' : tempScore <= 5 ? 'negative' : 'neutral' });
    }
  }
  
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    factors,
    recommendation: score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor',
  };
}

// Get current season
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

// Location Card Component
const LocationCard = ({ location, isSelected, onSelect, theme, waterTemp }) => {
  const isDark = theme === 'dark';
  const config = FISHING_LOCATIONS[location];
  const currentMonth = new Date().getMonth() + 1;
  const isBestMonth = config.bestMonths.includes(currentMonth);
  
  return (
    <button
      onClick={() => onSelect(location)}
      className={`
        p-3 rounded-lg border transition-all text-left
        ${isSelected 
          ? (isDark ? 'bg-cyan-500/20 border-cyan-500' : 'bg-cyan-100 border-cyan-500')
          : (isDark ? 'bg-slate-800/50 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-slate-400 shadow-sm')
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-medium ${isSelected ? (isDark ? 'text-cyan-400' : 'text-cyan-700') : (isDark ? 'text-white' : 'text-slate-800')}`}>
          {config.name}
        </span>
        <div className="flex items-center gap-1.5">
          {waterTemp?.tempF != null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              waterTemp.source === 'Seasonal Model' 
                ? (isDark ? 'bg-slate-600/30 text-slate-400' : 'bg-slate-100 text-slate-500')
                : (isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-50 text-cyan-600')
            }`}>
              💧 {waterTemp.tempF}°F
            </span>
          )}
          {isBestMonth && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
              Peak Season
            </span>
          )}
        </div>
      </div>
      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {config.primarySpecies} • {config.type}
      </div>
    </button>
  );
};

// Main Fishing Mode Component
const FishingMode = ({ windData, pressureData, isLoading, upstreamData = {} }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedLocation, setSelectedLocation] = useState('strawberry');
  
  const location = FISHING_LOCATIONS[selectedLocation];
  const season = getCurrentSeason();
  const moonPhase = getMoonPhase();
  const solunar = getSolunarPeriods();
  const currentHour = new Date().getHours();
  
  // Get conditions
  const windSpeed = windData?.stations?.[0]?.speed || windData?.speed || 5;
  const pressure = pressureData?.slcPressure || 30.0;
  const pressureTrend = pressureData?.gradient > 0 ? 'rising' : pressureData?.gradient < 0 ? 'falling' : 'stable';
  
  // Fetch all USGS water temps once for all location cards
  const [allWaterTemps, setAllWaterTemps] = useState({});
  useEffect(() => {
    getAllWaterTemps().then(setAllWaterTemps).catch(() => {});
  }, []);

  const waterTempData = allWaterTemps[selectedLocation] || null;

  const waterTemp = useMemo(() => {
    if (waterTempData?.tempF != null && !waterTempData.stale) {
      return waterTempData.tempF;
    }
    // Fallback: seasonal estimate
    const baseTemp = { spring: 50, summer: 65, fall: 55, winter: 38 }[season];
    const elevationAdjust = (location.elevation - 5000) / 1000 * -3;
    return Math.round(baseTemp + elevationAdjust);
  }, [waterTempData, season, location.elevation]);

  const waterTempSource = waterTempData?.source === 'USGS' ? 'usgs'
    : waterTempData?.source === 'Satellite Avg' ? 'satellite-avg'
    : 'estimate';

  const fishingScore = calculateFishingScore(selectedLocation, {
    pressure,
    pressureTrend,
    windSpeed,
    waterTemp,
    moonPhase,
    hour: currentHour,
  });
  
  const pressureAnalysis = analyzePressure(pressure, pressureTrend);
  const depthInfo = location.depths?.[season] || { min: 10, max: 30, description: 'Variable' };

  // Learned model prediction
  const aiPrediction = useMemo(() => {
    try {
      return predictFishing(
        { speed: windSpeed, temperature: waterTemp },
        { slcPressure: pressure, pressure },
      );
    } catch (e) { return null; }
  }, [windSpeed, pressure, waterTemp]);
  
  // Build the fishing opportunity banner
  const fishOpp = useMemo(() => {
    const score = fishingScore.score;
    const aiProb = aiPrediction?.probability || 0;
    const bestHours = aiPrediction?.bestTimesToday || [];
    const goldenHour = aiPrediction?.isGoldenHour;
    const solunarActive = aiPrediction?.solunar?.currentPeriod;
    const moonGood = aiPrediction?.moonPhase?.rating >= 4;
    const pressureFalling = aiPrediction?.pressureTrend?.trend?.includes('falling');
    const now = new Date().getHours();

    // Currently a great time
    if (score >= 70 || goldenHour || solunarActive) {
      const reasons = [];
      if (goldenHour) reasons.push('Golden Hour');
      if (solunarActive) reasons.push(`${solunarActive} Solunar`);
      if (pressureFalling) reasons.push('Falling Pressure');
      if (moonGood) reasons.push('Strong Moon Phase');
      return {
        color: 'green', headline: 'Fish Are Biting!',
        subline: reasons.length > 0 ? reasons.join(' + ') : `${score}% activity — conditions are excellent`,
        displayScore: Math.max(score, aiProb),
        badge: goldenHour ? { text: 'GOLDEN HOUR', color: 'bg-amber-500 text-white animate-pulse' }
          : solunarActive ? { text: 'SOLUNAR', color: 'bg-green-500 text-white animate-pulse' }
          : { text: 'GO FISH', color: 'bg-green-500 text-white' },
      };
    }

    // AI prediction says good time coming
    if (aiProb >= 45 && bestHours.length > 0) {
      const nextGoodHour = bestHours.find(h => {
        const parsed = parseInt(h);
        return parsed >= now;
      });
      const timeStr = nextGoodHour || bestHours[0];
      return {
        color: aiProb >= 60 ? 'green' : 'yellow',
        headline: nextGoodHour ? `Best Bite at ${timeStr}` : `Peak Hours: ${bestHours.slice(0, 3).join(', ')}`,
        subline: [
          moonGood ? 'Strong moon' : null,
          pressureFalling ? 'Falling pressure (active fish)' : null,
          aiPrediction?.recommendation,
        ].filter(Boolean)[0] || `${aiProb}% activity predicted`,
        displayScore: aiProb,
        badge: { text: 'PREDICTED', color: aiProb >= 60
          ? (isDark ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-green-100 text-green-700 border border-green-300')
          : (isDark ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-yellow-100 text-yellow-700 border border-yellow-300') },
        arriveBy: nextGoodHour,
      };
    }

    return {
      color: score >= 50 ? 'yellow' : 'red',
      headline: `${location.name} — ${fishingScore.recommendation}`,
      subline: 'Monitoring conditions',
      displayScore: score, badge: null,
    };
  }, [fishingScore, aiPrediction, location, isDark]);

  const fishBannerColors = {
    green: isDark ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/40' : 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300',
    yellow: isDark ? 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/30' : 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300',
    red: isDark ? 'bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border-blue-500/30' : 'bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300',
  };
  const fishScoreColors = {
    green: isDark ? 'text-green-400' : 'text-green-600',
    yellow: isDark ? 'text-yellow-400' : 'text-yellow-600',
    red: isDark ? 'text-red-400' : 'text-red-600',
  };

  return (
    <div className="space-y-6">
      {/* Header — Forecast-driven */}
      <div className={`rounded-xl p-4 border ${fishBannerColors[fishOpp.color]}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            fishOpp.color === 'green' ? (isDark ? 'bg-green-500/30' : 'bg-green-200') : (isDark ? 'bg-blue-500/20' : 'bg-blue-200')
          }`}>
            <Fish className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Utah Fishing Forecast</h2>
            <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{location.name}</p>
          </div>
          {fishOpp.badge && (
            <div className={`text-[10px] font-bold px-3 py-1 rounded-full ${fishOpp.badge.color}`}>
              {fishOpp.badge.text}
            </div>
          )}
        </div>
        
        {/* Opportunity Card */}
        <div className={`rounded-lg p-4 ${
          fishOpp.color === 'green' ? (isDark ? 'bg-green-500/15 border border-green-500/40' : 'bg-green-50 border border-green-300')
          : fishOpp.color === 'yellow' ? (isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-300')
          : (isDark ? 'bg-slate-700/30 border border-slate-600/30' : 'bg-white border border-slate-200')
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className={`text-xl font-bold ${fishOpp.color === 'green' ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                {fishOpp.headline}
              </div>
              <div className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{fishOpp.subline}</div>
              {fishOpp.arriveBy && (
                <div className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                }`}>
                  🎣 Best window at {fishOpp.arriveBy}
                </div>
              )}
            </div>
            <div className="text-right ml-3 flex-shrink-0">
              <div className={`text-4xl font-black ${fishScoreColors[fishOpp.color]}`}>
                {fishOpp.displayScore}%
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>activity</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Prediction Panel */}
      {aiPrediction && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/50 border-blue-500/30' : 'bg-blue-50 border-blue-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>AI Fishing Prediction</span>
              {aiPrediction.isUsingLearnedWeights && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                  {aiPrediction.weightsVersion}
                </span>
              )}
            </div>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>4,984 observations</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                aiPrediction.probability >= 60 ? (isDark ? 'text-green-400' : 'text-green-600') :
                aiPrediction.probability >= 40 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') :
                (isDark ? 'text-red-400' : 'text-red-600')
              }`}>
                {aiPrediction.probability}%
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Activity</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                {aiPrediction.moonPhase?.name?.split(' ')[0] || '--'}
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {aiPrediction.moonPhase?.rating >= 5 ? '⭐ Best' : aiPrediction.moonPhase?.rating >= 4 ? 'Good' : 'Fair'} Moon
              </div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${
                aiPrediction.pressureTrend?.trend?.includes('falling') ? (isDark ? 'text-green-400' : 'text-green-600') :
                aiPrediction.pressureTrend?.trend === 'stable' ? (isDark ? 'text-blue-400' : 'text-blue-600') :
                (isDark ? 'text-orange-400' : 'text-orange-600')
              }`}>
                {aiPrediction.pressureTrend?.trend?.includes('falling') ? '↓' :
                 aiPrediction.pressureTrend?.trend === 'stable' ? '→' : '↑'}
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pressure</div>
            </div>
          </div>

          {/* Solunar period */}
          {aiPrediction.solunar?.currentPeriod && (
            <div className={`rounded-lg p-2 mb-2 flex items-center gap-2 text-xs ${isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
              <Zap className="w-3 h-3" />
              {aiPrediction.solunar.currentPeriod} Solunar Period Active — fish are feeding!
            </div>
          )}

          {aiPrediction.isGoldenHour && (
            <div className={`rounded-lg p-2 mb-2 flex items-center gap-2 text-xs ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'}`}>
              <Sun className="w-3 h-3" />
              Golden Hour — peak feeding window!
            </div>
          )}

          {/* Recommendation */}
          <div className={`text-xs italic ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            {aiPrediction.recommendation}
          </div>

          {aiPrediction.bestTimesToday?.length > 0 && (
            <div className={`mt-2 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Best hours today: {aiPrediction.bestTimesToday.join(', ')}
            </div>
          )}

          <div className={`mt-1 text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'} flex items-center gap-2`}>
            <span>Seasonal: ×{aiPrediction.seasonalMult}</span>
            <span>Hourly: ×{aiPrediction.hourlyMult}</span>
          </div>
        </div>
      )}

      {/* Location Selector */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <MapPin className="w-4 h-4" />
          Select Location
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(FISHING_LOCATIONS).map(loc => (
            <LocationCard
              key={loc}
              location={loc}
              isSelected={selectedLocation === loc}
              onSelect={setSelectedLocation}
              theme={theme}
              waterTemp={allWaterTemps[loc]}
            />
          ))}
        </div>
      </div>
      
      {/* Key Factors Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Moon Phase */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Moon className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Moon Phase</span>
          </div>
          <div className="text-3xl mb-1">{moonPhase.icon}</div>
          <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{moonPhase.name}</div>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{moonPhase.description}</div>
          <div className="flex gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= moonPhase.rating ? 'bg-yellow-400' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`} />
            ))}
          </div>
        </div>
        
        {/* Barometric Pressure */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pressure</span>
          </div>
          <div className={`text-2xl font-bold ${pressureAnalysis.color}`}>
            {pressure?.toFixed(2) || '--'}
            <span className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>inHg</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {pressureTrend === 'falling' && <TrendingDown className="w-4 h-4 text-green-400" />}
            {pressureTrend === 'rising' && <TrendingUp className="w-4 h-4 text-red-400" />}
            {pressureTrend === 'stable' && <Minus className="w-4 h-4 text-yellow-400" />}
            <span className={`text-xs capitalize ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pressureTrend}</span>
          </div>
          <div className="flex gap-1 mt-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= pressureAnalysis.rating ? 'bg-green-400' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`} />
            ))}
          </div>
        </div>
        
        {/* Water Temp */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className={`w-4 h-4 ${waterTempSource === 'usgs' ? 'text-cyan-400' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {waterTempSource === 'usgs' ? 'Water Temp (USGS)' :
               waterTempSource === 'satellite-avg' ? 'Water Temp' : 'Est. Water Temp'}
            </span>
            {waterTempSource === 'usgs' && (
              <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">LIVE</span>
            )}
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {waterTemp}°F
          </div>
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {location.primarySpecies} optimal: {FISH_SPECIES[location.primarySpecies]?.tempOptimal.join('-')}°F
          </div>
          {waterTempData?.sourceName && waterTempSource !== 'estimate' && (
            <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {waterTempData.note}
            </div>
          )}
        </div>
        
        {/* Best Depth */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Waves className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Depth ({season})</span>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {depthInfo.min}-{depthInfo.max} ft
          </div>
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {depthInfo.description}
          </div>
        </div>
      </div>
      
      {/* Solunar Feeding Times */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <Clock className="w-4 h-4" />
          Best Fishing Times Today
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...solunar.major, ...solunar.minor].map((period, i) => {
            const isActive = currentHour >= period.start && currentHour < period.end;
            return (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${
                  isActive 
                    ? (isDark ? 'bg-green-500/20 border-green-500/50' : 'bg-green-100 border-green-300')
                    : (isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200')
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {period.type === 'major' ? (
                    <Sun className={`w-4 h-4 ${isActive ? 'text-green-400' : (isDark ? 'text-yellow-400' : 'text-yellow-600')}`} />
                  ) : (
                    <Sunset className={`w-4 h-4 ${isActive ? 'text-green-400' : (isDark ? 'text-orange-400' : 'text-orange-600')}`} />
                  )}
                  <span className={`text-xs font-medium uppercase ${
                    period.type === 'major' ? (isDark ? 'text-yellow-400' : 'text-yellow-700') : (isDark ? 'text-orange-400' : 'text-orange-700')
                  }`}>
                    {period.type}
                  </span>
                  {isActive && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/30 text-green-400' : 'bg-green-200 text-green-700'}`}>
                      NOW
                    </span>
                  )}
                </div>
                <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {period.start}:00 - {period.end}:00
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {period.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Species & Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Target Species */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Target className="w-4 h-4" />
            Target Species
          </h3>
          <div className="space-y-2">
            {location.species.map(species => {
              const speciesData = FISH_SPECIES[species];
              const isPrimary = species === location.primarySpecies;
              return (
                <div 
                  key={species}
                  className={`flex items-center justify-between p-2 rounded ${
                    isPrimary 
                      ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200')
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{speciesData?.icon || '🐟'}</span>
                    <span className={`${isPrimary ? 'font-medium' : ''} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {species}
                    </span>
                    {isPrimary && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                        Primary
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {speciesData?.tempOptimal.join('-')}°F
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Tips & Regulations */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <AlertTriangle className="w-4 h-4" />
            Tips & Regulations
          </h3>
          
          <div className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Regulations</div>
            <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{location.regulations}</div>
          </div>
          
          <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Pro Tip</div>
            <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{location.tips}</div>
          </div>
          
          {location.iceOff && (
            <div className={`mt-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Calendar className="w-3 h-3 inline mr-1" />
              Ice-off typically: {location.iceOff}
            </div>
          )}
        </div>
      </div>
      
      {/* Spawning Seasons */}
      {location.spawning && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Egg className="w-4 h-4" />
            Spawning Seasons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(location.spawning).map(([species, spawn]) => {
              const speciesData = FISH_SPECIES[species];
              const currentMonth = new Date().getMonth() + 1;
              const isSpawning = spawn.months.includes(currentMonth);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const spawnMonthsText = spawn.months.length > 0 && spawn.months[0] !== 0
                ? spawn.months.map(m => monthNames[m - 1]).join('-')
                : 'N/A';
              
              return (
                <div 
                  key={species}
                  className={`p-3 rounded-lg border ${
                    isSpawning 
                      ? (isDark ? 'bg-pink-500/10 border-pink-500/30' : 'bg-pink-50 border-pink-200')
                      : (isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200')
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{speciesData?.icon || '🐟'}</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{species}</span>
                    </div>
                    {isSpawning ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded ${isDark ? 'bg-pink-500/30 text-pink-400' : 'bg-pink-200 text-pink-700'}`}>
                        SPAWNING NOW
                      </span>
                    ) : (
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{spawnMonthsText}</span>
                    )}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {spawn.location}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {spawn.behavior}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Structure Types */}
      {location.structure && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Mountain className="w-4 h-4" />
            Structure Types to Target
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {location.structure.map((struct, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}
              >
                <div className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {struct.type}
                </div>
                <div className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {struct.description}
                </div>
                <div className="flex flex-wrap gap-1">
                  {struct.bestFor.map((species, j) => {
                    const speciesData = FISH_SPECIES[species];
                    return (
                      <span 
                        key={j}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {speciesData?.icon || '🐟'} {species}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Hotspots */}
      {location.hotspots && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Navigation className="w-4 h-4" />
            Hotspots & Fishing Areas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {location.hotspots.map((spot, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${isDark ? 'bg-gradient-to-br from-cyan-900/20 to-slate-800/50 border-cyan-500/20' : 'bg-gradient-to-br from-cyan-50 to-white border-cyan-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    📍 {spot.name}
                  </div>
                  {spot.coordinates && (
                    <a 
                      href={`https://www.google.com/maps?q=${spot.coordinates.lat},${spot.coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] px-2 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                      Map →
                    </a>
                  )}
                </div>
                <div className={`text-xs mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {spot.description}
                </div>
                <div className="flex flex-wrap gap-1">
                  {spot.species.map((species, j) => {
                    const speciesData = FISH_SPECIES[species];
                    return (
                      <span 
                        key={j}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}
                      >
                        {speciesData?.icon || '🐟'} {species}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Scoring Factors */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Score Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {fishingScore.factors.map((factor, i) => (
            <div 
              key={i}
              className={`p-2 rounded-lg text-center ${
                factor.impact === 'positive' ? (isDark ? 'bg-green-500/10' : 'bg-green-50') :
                factor.impact === 'negative' ? (isDark ? 'bg-red-500/10' : 'bg-red-50') :
                (isDark ? 'bg-slate-700/30' : 'bg-slate-50')
              }`}
            >
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{factor.name}</div>
              <div className={`font-medium text-sm ${
                factor.impact === 'positive' ? (isDark ? 'text-green-400' : 'text-green-600') :
                factor.impact === 'negative' ? (isDark ? 'text-red-400' : 'text-red-600') :
                (isDark ? 'text-slate-200' : 'text-slate-700')
              }`}>
                {factor.value}
              </div>
              {factor.impact === 'positive' && <CheckCircle className="w-3 h-3 text-green-400 mx-auto mt-1" />}
              {factor.impact === 'negative' && <AlertTriangle className="w-3 h-3 text-red-400 mx-auto mt-1" />}
            </div>
          ))}
        </div>
      </div>
      {/* Wind Forecast & Water Safety Warnings */}
      <WaterForecast
        locationId={selectedLocation === 'utah-lake' ? 'utah-lake' : 'utah-lake'}
        currentWind={{ speed: windSpeed }}
        pressureData={pressureData}
        activity="fishing"
        upstreamData={upstreamData}
      />
    </div>
  );
};

export default FishingMode;
