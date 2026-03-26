import { readFileSync } from 'fs';
const raw = readFileSync('C:/Users/Admin/.cursor/projects/c-Users-Admin-Documents-GitHub-WIND-APP/agent-tools/0e476355-c484-43c3-89db-7c2c6a2eba98.txt', 'utf8');
const json = JSON.parse(raw.trim().split('\n').pop());
console.log('Obs count:', json.observations?.length);
const first = json.observations?.[0];
const last = json.observations?.[json.observations.length - 1];
console.log('First:', first?.obsTimeLocal, '| wind:', first?.imperial?.windspeedAvg, 'mph dir:', first?.winddirAvg);
console.log('Last:', last?.obsTimeLocal, '| wind:', last?.imperial?.windspeedAvg, 'mph dir:', last?.winddirAvg);
