import React, { useState, useEffect, useMemo } from 'react';
import { Fish, Moon, Thermometer, Gauge, Clock, MapPin, TrendingUp, TrendingDown, Minus, Sun, Sunset, CloudRain, Wind, Waves, Calendar, Target, AlertTriangle, CheckCircle, Anchor, Navigation, Egg, Mountain, Brain, Zap, Droplets, CloudSun, Bug, Crosshair, Ship, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { predictFishing } from '../services/FishingPredictor';
import { getAllWaterTemps, getAllRiverFlows, getRiverFlowStatus } from '../services/USGSWaterService';
import { getDailyFlyPick, parseSkyCondition, TIME_WINDOW_LABELS } from '../services/FlyRecommender';
import { getDailyLurePick, LURES, getShoreStrategy, TIME_WINDOW_LABELS as LURE_TIME_LABELS } from '../services/LureRecommender';
import { isArtificialOnly } from '../services/RegulationFilter';
import WaterForecast from './WaterForecast';
import { safeToFixed } from '../utils/safeToFixed';
import { getUtahVernacular } from '../services/UtahVernacular';
import ProTeaser from './ProTeaser';
import RegulationsCard from './RegulationsCard';
import stockingData from '../data/stocking-data.json';
import tackleImageMap from '../data/image-map.json';

const _tackleKeys = Object.keys(tackleImageMap).filter(k => k !== '_meta');
function getTackleImage(name) {
  if (!name) return null;
  const exact = tackleImageMap[name];
  if (exact) return exact;
  const match = _tackleKeys.find(k => name.includes(k) || k.includes(name));
  return match ? tackleImageMap[match] : null;
}

function TackleThumb({ name, className = '' }) {
  const src = getTackleImage(name);
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover rounded-lg border border-white/10 shadow-sm flex-shrink-0 ${className}`}
    />
  );
}

// Utah Fishing Locations Configuration
export const FISHING_LOCATIONS = {
  'strawberry': {
    id: 'strawberry',
    name: 'Strawberry Reservoir',
    region: 'Wasatch',
    elevation: 7600,
    coordinates: { lat: 40.1783, lng: -111.1952 }, // Strawberry Bay Marina boat ramp
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
    regulations: 'Limit 4 trout. NO KEEPING Cutthroat between 15-22 inches. All Cutthroat in the slot must be immediately released.',
    tips: 'Soldier Creek arm is most productive. Use tube jigs tipped with worm.',
  },
  'flaming-gorge': {
    id: 'flaming-gorge',
    name: 'Flaming Gorge',
    region: 'Daggett',
    elevation: 6040,
    coordinates: { lat: 41.0385, lng: -109.5725 }, // Lucerne Valley Marina
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
    coordinates: { lat: 40.4093, lng: -111.5084 }, // Deer Creek State Park main boat ramp
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
  'provo-lower': {
    id: 'provo-lower',
    name: 'Lower Provo River',
    region: 'Wasatch/Utah',
    elevation: 5500,
    coordinates: { lat: 40.3340, lng: -111.6105 }, // Olmstead Diversion — primary lower Provo access
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
    regulations: 'Artificial flies and lures only. Closed to cutthroat harvest.',
    tips: 'Blue Winged Olive hatches in March-May. Match the hatch!',
  },
  'provo-middle': {
    id: 'provo-middle',
    name: 'Middle Provo River',
    region: 'Wasatch',
    elevation: 5600,
    coordinates: { lat: 40.5128, lng: -111.4640 }, // Midway stretch — primary wade access below Jordanelle
    type: 'river',
    species: ['Brown Trout', 'Rainbow Trout', 'Mountain Whitefish', 'Cutthroat Trout'],
    primarySpecies: 'Brown Trout',
    bestMonths: [3, 4, 5, 9, 10, 11],
    sections: {
      upper: { description: 'Below Jordanelle Dam — cold tailwater, consistent flows' },
      middle: { description: 'Midway reach — meadow water, great dry fly' },
      lower: { description: 'Near Deer Creek Reservoir — deeper pools, bigger fish' },
    },
    spawning: {
      'Brown Trout': { months: [10, 11], location: 'Gravel runs throughout middle section', behavior: 'Build redds in moderate current — avoid wading on gravel Oct-Dec' },
      'Rainbow Trout': { months: [3, 4, 5], location: 'Riffles and gravel bars', behavior: 'Spring spawners, active in faster water' },
      'Mountain Whitefish': { months: [10, 11], location: 'Deep runs', behavior: 'Spawn alongside browns in deeper water' },
    },
    structure: [
      { type: 'Tailwater Pools', description: 'Cold deep pools below Jordanelle Dam', bestFor: ['Brown Trout', 'Rainbow Trout'] },
      { type: 'Meadow Bends', description: 'Undercut banks along meadow curves', bestFor: ['Brown Trout'] },
      { type: 'Riffle-Pool Transitions', description: 'Classic holding water', bestFor: ['Rainbow Trout', 'Mountain Whitefish'] },
      { type: 'Log Jams', description: 'Woody debris creating cover', bestFor: ['Brown Trout'] },
    ],
    hotspots: [
      { name: 'Below Jordanelle Dam', description: 'Cold tailwater, consistent year-round', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.575, lng: -111.425 } },
      { name: 'Midway Stretch', description: 'Meadow water, excellent dry fly fishing', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.515, lng: -111.468 } },
      { name: 'River Road Access', description: 'Easy wade access, good pocket water', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.495, lng: -111.480 } },
      { name: 'Upper Deer Creek Inlet', description: 'Fish stack here pre-spawn', species: ['Brown Trout'], coordinates: { lat: 40.445, lng: -111.465 } },
    ],
    regulations: 'Artificial flies and lures only on some sections. Check UDWR for current regs.',
    tips: 'Tailwater section below Jordanelle fishes well year-round. BWO hatches in March–May are outstanding. Flow-dependent — check USGS gauge before going.',
  },
  'provo-upper': {
    id: 'provo-upper',
    name: 'Upper Provo River',
    region: 'Wasatch',
    elevation: 6400,
    coordinates: { lat: 40.5670, lng: -111.3580 }, // Woodland access — upper Provo above Jordanelle
    type: 'river',
    species: ['Brown Trout', 'Rainbow Trout', 'Cutthroat Trout', 'Mountain Whitefish'],
    primarySpecies: 'Brown Trout',
    bestMonths: [6, 7, 8, 9, 10],
    sections: {
      upper: { description: 'Above Woodland — headwaters, small wild fish' },
      lower: { description: 'Woodland to Jordanelle — good access, mix of wild and planted' },
    },
    spawning: {
      'Brown Trout': { months: [10, 11], location: 'Gravel runs', behavior: 'Build redds in moderate current' },
      'Rainbow Trout': { months: [3, 4, 5], location: 'Riffle gravel', behavior: 'Spring spawners' },
      'Cutthroat Trout': { months: [5, 6], location: 'Smaller tributaries', behavior: 'Move into feeders to spawn' },
    },
    structure: [
      { type: 'Pocket Water', description: 'Boulder-strewn runs with holding pockets', bestFor: ['Brown Trout', 'Rainbow Trout'] },
      { type: 'Undercut Banks', description: 'Eroded banks along meadow bends', bestFor: ['Brown Trout'] },
      { type: 'Beaver Ponds', description: 'Backed-up pools with deeper holding water', bestFor: ['Brown Trout', 'Cutthroat Trout'] },
    ],
    hotspots: [
      { name: 'Woodland Bridge', description: 'Easy access, good pocket water', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.567, lng: -111.358 } },
      { name: 'Pine Valley', description: 'Less pressure, wild fish', species: ['Cutthroat Trout', 'Brown Trout'], coordinates: { lat: 40.590, lng: -111.340 } },
    ],
    regulations: 'Artificial flies and lures only. Check UDWR for current section-specific regulations.',
    tips: 'Less pressured than the lower or middle sections. Great summer hopper fishing. Smaller water — lighter tippets and stealthy approaches pay off.',
  },
  'weber-river': {
    id: 'weber-river',
    name: 'Weber River',
    region: 'Summit/Morgan',
    elevation: 5600,
    coordinates: { lat: 40.7910, lng: -111.3970 }, // Wanship/Coalville public wade access
    type: 'river',
    species: ['Brown Trout', 'Rainbow Trout', 'Mountain Whitefish', 'Cutthroat Trout'],
    primarySpecies: 'Brown Trout',
    bestMonths: [3, 4, 5, 6, 9, 10, 11],
    sections: {
      upper: { description: 'Oakley to Wanship — small water, wild trout, less pressure' },
      middle: { description: 'Wanship to Coalville — great wade fishing, accessible' },
      lower: { description: 'Coalville to Echo — bigger water, bigger fish, float-friendly' },
    },
    spawning: {
      'Brown Trout': { months: [10, 11], location: 'Gravel bars and tailouts', behavior: 'Aggressive pre-spawn, build redds in moderate current' },
      'Rainbow Trout': { months: [3, 4, 5], location: 'Riffle gravel', behavior: 'Spring spawners, actively feeding pre-spawn' },
      'Mountain Whitefish': { months: [10, 11], location: 'Deep runs and pools', behavior: 'Spawn in deeper water alongside browns' },
    },
    structure: [
      { type: 'Undercut Banks', description: 'Eroded banks with deep pockets — hold the biggest browns', bestFor: ['Brown Trout'] },
      { type: 'Bridge Pools', description: 'Deep scoured pools below bridges', bestFor: ['Brown Trout', 'Rainbow Trout'] },
      { type: 'Riffles', description: 'Fast shallow water over gravel', bestFor: ['Rainbow Trout', 'Mountain Whitefish'] },
      { type: 'Beaver Ponds', description: 'Backed-up slow sections', bestFor: ['Brown Trout', 'Cutthroat Trout'] },
    ],
    hotspots: [
      { name: 'Peoa Stretch', description: 'Upper Weber, wild fish, less pressure', species: ['Brown Trout', 'Cutthroat Trout'], coordinates: { lat: 40.725, lng: -111.355 } },
      { name: 'Wanship to Coalville', description: 'Best wade access, public land stretches', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.790, lng: -111.400 } },
      { name: 'Below Rockport Dam', description: 'Tailwater section, consistent flows', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.782, lng: -111.385 } },
      { name: 'Echo to Henefer', description: 'Bigger water, float fishing, trophy potential', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.905, lng: -111.475 } },
    ],
    regulations: 'Check UDWR for current section-specific regulations',
    tips: 'Underrated fishery with less pressure than the Provo. Fall streamer fishing for browns is exceptional. Hopper-dropper rigs in summer are deadly along grassy banks.',
  },
  'green-a': {
    id: 'green-a',
    name: 'Green River — A Section',
    region: 'Daggett',
    elevation: 5600,
    coordinates: { lat: 40.9140, lng: -109.4220 }, // Spillway boat ramp — A Section put-in below Flaming Gorge Dam
    type: 'river',
    species: ['Rainbow Trout', 'Brown Trout', 'Cutthroat Trout'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [3, 4, 5, 9, 10],
    sections: {
      upper: { description: 'Dam to Dripping Springs — turbid cold water, nymph heaven' },
      lower: { description: 'Dripping Springs to Little Hole — classic dry fly water' },
    },
    spawning: {
      'Rainbow Trout': { months: [3, 4, 5], location: 'Gravel bars throughout A Section', behavior: 'Spring spawners, aggressive feeders pre-spawn' },
      'Brown Trout': { months: [10, 11], location: 'Deeper runs', behavior: 'Fall spawners, territorial — watch for redds' },
    },
    structure: [
      { type: 'Tailouts', description: 'End of pools where water speeds up', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Seams', description: 'Current breaks between fast/slow water', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Weed Beds', description: 'Aquatic vegetation — scud and midge habitat', bestFor: ['Rainbow Trout'] },
      { type: 'Boulders', description: 'Large rocks creating eddies and holding lies', bestFor: ['Brown Trout'] },
    ],
    hotspots: [
      { name: 'Spillway Put-In', description: 'Cold tailwater immediately below dam', species: ['Rainbow Trout'], coordinates: { lat: 40.914, lng: -109.422 } },
      { name: 'Dripping Springs', description: 'Mid-A Section, consistent hatches', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.910, lng: -109.410 } },
      { name: 'Red Creek Rapids', description: 'Technical water, big fish hold here', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.905, lng: -109.395 } },
      { name: 'Little Hole Take-Out', description: 'Classic access, heavy pressure but productive', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.905, lng: -109.395 } },
    ],
    regulations: 'Artificial flies and lures only. 3 trout limit, only 1 over 20".',
    tips: 'Most popular 7-mile stretch. Cicada hatch in June is legendary. Scuds and midges produce year-round. Float or wade — both productive.',
  },
  'green-b': {
    id: 'green-b',
    name: 'Green River — B Section',
    region: 'Daggett',
    elevation: 5500,
    coordinates: { lat: 40.9050, lng: -109.3950 }, // Little Hole trailhead — B Section put-in
    type: 'river',
    species: ['Rainbow Trout', 'Brown Trout', 'Cutthroat Trout'],
    primarySpecies: 'Brown Trout',
    bestMonths: [4, 5, 9, 10, 11],
    sections: {
      upper: { description: 'Little Hole to Grasshopper Flats — varied structure' },
      lower: { description: 'Grasshopper Flats to Indian Crossing — remote, technical' },
    },
    spawning: {
      'Brown Trout': { months: [10, 11], location: 'Gravel runs throughout B Section', behavior: 'Fall spawners — prime streamer water during pre-spawn aggression' },
      'Rainbow Trout': { months: [3, 4, 5], location: 'Gravel bars', behavior: 'Spring spawners, less concentrated than A Section' },
    },
    structure: [
      { type: 'Deep Pools', description: 'Slow, deep holding water for trophy browns', bestFor: ['Brown Trout'] },
      { type: 'Boulders', description: 'Large rock gardens creating eddies', bestFor: ['Brown Trout', 'Rainbow Trout'] },
      { type: 'Riffles', description: 'Shallow gravel runs, great nymph water', bestFor: ['Rainbow Trout'] },
      { type: 'Seams', description: 'Current breaks between fast and slow', bestFor: ['Brown Trout', 'Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'Little Hole Trail', description: 'Wade access along B Section', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.905, lng: -109.395 } },
      { name: 'Grasshopper Flats', description: 'Summer terrestrial fishing — hoppers and beetles', species: ['Rainbow Trout'], coordinates: { lat: 40.895, lng: -109.385 } },
      { name: 'Indian Crossing', description: 'Remote take-out, less pressure', species: ['Brown Trout'], coordinates: { lat: 40.870, lng: -109.350 } },
    ],
    regulations: 'Artificial flies and lures only. 2 trout limit, only 1 over 20".',
    tips: 'Most restrictive and technical section. Trophy brown trout water. Best approached by drift boat. Fall streamer fishing here is world-class.',
  },
  'green-c': {
    id: 'green-c',
    name: 'Green River — C Section',
    region: 'Daggett/Uintah',
    elevation: 5400,
    coordinates: { lat: 40.8250, lng: -109.0250 }, // Browns Park — remote C Section access
    type: 'river',
    species: ['Brown Trout', 'Rainbow Trout', 'Channel Catfish', 'Smallmouth Bass'],
    primarySpecies: 'Brown Trout',
    bestMonths: [5, 6, 9, 10],
    sections: {
      upper: { description: 'Indian Crossing to Swallow Canyon — transition zone' },
      lower: { description: 'Browns Park to Colorado border — remote, bait allowed' },
    },
    spawning: {
      'Brown Trout': { months: [10, 11], location: 'Throughout river', behavior: 'Fall spawners, trophy potential in remote water' },
      'Smallmouth Bass': { months: [5, 6], location: 'Gravel/cobble areas', behavior: 'Nest builders in shallow areas' },
    },
    structure: [
      { type: 'Deep Pools', description: 'Large holding water', bestFor: ['Brown Trout', 'Channel Catfish'] },
      { type: 'Riffles', description: 'Shallow runs', bestFor: ['Rainbow Trout', 'Smallmouth Bass'] },
      { type: 'Boulders', description: 'Rock structure creating eddies', bestFor: ['Brown Trout'] },
    ],
    hotspots: [
      { name: 'Browns Park', description: 'Remote, trophy browns, less angler pressure', species: ['Brown Trout'], coordinates: { lat: 40.825, lng: -109.025 } },
      { name: 'Swallow Canyon', description: 'Scenic, technical wade fishing', species: ['Brown Trout', 'Rainbow Trout'], coordinates: { lat: 40.850, lng: -109.100 } },
    ],
    regulations: 'All methods allowed including bait. 8 trout limit.',
    tips: 'Most remote and least pressured section. Trophy browns in deep pools. Bait is legal here. Multi-day float trips recommended.',
  },
  'utah-lake': {
    id: 'utah-lake',
    name: 'Utah Lake',
    region: 'Utah',
    elevation: 4489,
    coordinates: { lat: 40.1437, lng: -111.8019 }, // Lincoln Beach Marina — most popular access
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
    coordinates: { lat: 40.5990, lng: -111.4302 }, // Hailstone Marina — primary boat ramp
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
    coordinates: { lat: 41.2552, lng: -111.8484 }, // Cemetery Point boat ramp — primary access
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
  'bear-lake': {
    id: 'bear-lake', name: 'Bear Lake', region: 'Rich', elevation: 5924,
    coordinates: { lat: 41.9600, lng: -111.3020 }, // Rendezvous Beach / Cisco Beach — primary shore access
    type: 'lake',
    species: ['Cutthroat Trout', 'Lake Trout', 'Rainbow Trout'],
    primarySpecies: 'Cutthroat Trout',
    bestMonths: [1, 5, 6, 9, 10],
    depths: { spring: { min: 5, max: 30, description: 'Shore casting for cutts' }, summer: { min: 40, max: 100, description: 'Lakers go deep' }, fall: { min: 20, max: 60, description: 'Cooling surface' } },
    spawning: { 'Cutthroat Trout': { months: [5, 6], location: 'Bear River tributaries', behavior: 'Unique Bear Lake strain' } },
    structure: [
      { type: 'Rocky Shoreline', description: 'East side rock structure', bestFor: ['Cutthroat Trout'] },
      { type: 'Deep Basins', description: '200+ ft depths', bestFor: ['Lake Trout'] },
    ],
    hotspots: [
      { name: 'Cisco Beach', description: 'January cisco dipnetting tradition', species: ['Bonneville Cisco'], coordinates: { lat: 41.985, lng: -111.305 } },
      { name: 'North Beach', description: 'Shore casting for cutthroat', species: ['Cutthroat Trout'], coordinates: { lat: 42.005, lng: -111.345 } },
      { name: 'East Side', description: 'Deep water lake trout', species: ['Lake Trout'], coordinates: { lat: 41.960, lng: -111.285 } },
    ],
    regulations: 'Lake trout: 3 fish limit. Cutthroat: 2 fish limit',
    tips: 'January cisco dip netting is a must-do Utah tradition. Endemic species found nowhere else on Earth.',
  },
  'willard-bay': {
    id: 'willard-bay', name: 'Willard Bay', region: 'Box Elder', elevation: 4200,
    coordinates: { lat: 41.369, lng: -112.077 }, type: 'reservoir',
    species: ['Wiper', 'Walleye', 'Channel Catfish', 'Black Crappie'],
    primarySpecies: 'Wiper',
    bestMonths: [5, 6, 7, 8, 9],
    depths: { spring: { min: 4, max: 15, description: 'Shad schools forming' }, summer: { min: 6, max: 20, description: 'Surface feeding wipers' }, fall: { min: 5, max: 15, description: 'Pre-winter feed' } },
    spawning: { 'Wiper': { months: [0], location: 'N/A — sterile hybrid', behavior: 'Does not spawn (stocked)' }, 'Walleye': { months: [3, 4], location: 'Rocky shorelines', behavior: 'Night spawners' } },
    structure: [
      { type: 'Shad Schools', description: 'Follow the baitfish', bestFor: ['Wiper', 'Walleye'] },
      { type: 'Rip-rap', description: 'Dike rock structure', bestFor: ['Walleye', 'Channel Catfish'] },
      { type: 'Marina Docks', description: 'Shade structure', bestFor: ['Black Crappie', 'Wiper'] },
    ],
    hotspots: [
      { name: 'North Marina', description: 'Prime wiper surface action', species: ['Wiper', 'Channel Catfish'], coordinates: { lat: 41.385, lng: -112.075 } },
      { name: 'South Marina', description: 'Walleye and crappie', species: ['Walleye', 'Black Crappie'], coordinates: { lat: 41.355, lng: -112.085 } },
    ],
    regulations: 'Gizzard shad: unlawful to possess (forage species)',
    tips: 'Wiper surface feeding on shad schools is explosive action. Watch for bird activity.',
  },
  'starvation': {
    id: 'starvation', name: 'Starvation Reservoir', region: 'Duchesne', elevation: 5710,
    coordinates: { lat: 40.1855, lng: -110.4415 }, // Starvation State Park main boat ramp
    type: 'reservoir',
    species: ['Walleye', 'Rainbow Trout', 'Smallmouth Bass', 'Brown Trout'],
    primarySpecies: 'Walleye',
    bestMonths: [3, 4, 5, 10, 11],
    depths: { spring: { min: 8, max: 25, description: 'Walleye pre-spawn flats' }, summer: { min: 20, max: 50, description: 'Main lake structure' }, fall: { min: 15, max: 35, description: 'Following baitfish' } },
    spawning: { 'Walleye': { months: [3, 4], location: 'Rocky points 8-15 ft', behavior: 'Night spawning on gravel' } },
    structure: [
      { type: 'Rocky Points', description: 'Main lake points', bestFor: ['Walleye', 'Smallmouth Bass'] },
      { type: 'River Channel', description: 'Old Duchesne River bed', bestFor: ['Walleye', 'Brown Trout'] },
    ],
    hotspots: [
      { name: 'Dam Area', description: 'Deep structure, consistent walleye', species: ['Walleye', 'Rainbow Trout'], coordinates: { lat: 40.175, lng: -110.435 } },
    ],
    regulations: 'Walleye: 6 fish limit',
    tips: 'Top walleye fishery. Jig fishing in spring is most productive.',
  },
  'yuba': {
    id: 'yuba', name: 'Yuba Reservoir', region: 'Juab', elevation: 5100,
    coordinates: { lat: 39.4050, lng: -111.9280 }, // Painted Rocks boat ramp
    type: 'reservoir',
    species: ['Walleye', 'Northern Pike', 'Channel Catfish', 'Wiper', 'Tiger Muskie'],
    primarySpecies: 'Walleye',
    bestMonths: [3, 4, 5, 9, 10],
    depths: { spring: { min: 5, max: 20, description: 'Walleye spawning flats' }, summer: { min: 15, max: 40, description: 'Wiper chasing shad' }, fall: { min: 10, max: 30, description: 'Pike ambush points' } },
    spawning: { 'Northern Pike': { months: [3, 4], location: 'Weedy shallows 2-6 ft', behavior: 'Early spring spawners' }, 'Walleye': { months: [3, 4], location: 'Rocky shorelines', behavior: 'Night spawning' } },
    structure: [
      { type: 'Weed Beds', description: 'Extensive shallow vegetation', bestFor: ['Northern Pike', 'Tiger Muskie'] },
      { type: 'Rocky Points', description: 'Main lake structure', bestFor: ['Walleye', 'Wiper'] },
    ],
    hotspots: [
      { name: 'North End', description: 'Pike and muskie ambush water', species: ['Northern Pike', 'Tiger Muskie'], coordinates: { lat: 39.470, lng: -111.910 } },
      { name: 'Painted Rocks', description: 'Walleye and wiper', species: ['Walleye', 'Wiper'], coordinates: { lat: 39.410, lng: -111.930 } },
    ],
    regulations: 'Northern pike: unlimited harvest (invasive management)',
    tips: '22-mile predator paradise. Northern pike unlimited harvest helps native species.',
  },
  'scofield': {
    id: 'scofield', name: 'Scofield Reservoir', region: 'Carbon', elevation: 7618,
    coordinates: { lat: 39.7865, lng: -111.1518 }, // Scofield State Park boat ramp (Madsen Bay)
    type: 'reservoir',
    species: ['Cutthroat Trout', 'Rainbow Trout', 'Tiger Trout'],
    primarySpecies: 'Cutthroat Trout',
    bestMonths: [5, 6, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Post ice-off shallows' }, summer: { min: 10, max: 30, description: 'Thermocline' }, fall: { min: 5, max: 20, description: 'Cooling surface' } },
    spawning: { 'Cutthroat Trout': { months: [5, 6], location: 'Tributary streams', behavior: 'Run up Fish Creek' } },
    structure: [
      { type: 'Weed Beds', description: 'Submerged vegetation', bestFor: ['Cutthroat Trout', 'Tiger Trout'] },
      { type: 'Inlet Areas', description: 'Where Fish Creek enters', bestFor: ['Cutthroat Trout', 'Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'Fish Creek Inlet', description: 'Best wild cutthroat stream in Utah', species: ['Cutthroat Trout'], coordinates: { lat: 39.810, lng: -111.145 } },
    ],
    regulations: 'Cutthroat/Tiger trout 15-22" must be released. Combined limit 4.',
    tips: 'Blue Ribbon fishery. Upper Fish Creek is world-class wild cutthroat water.',
  },
  'lake-powell': {
    id: 'lake-powell', name: 'Lake Powell', region: 'Kane/San Juan', elevation: 3700,
    coordinates: { lat: 37.0173, lng: -111.4858 }, // Wahweap Marina — primary boat launch
    type: 'reservoir',
    species: ['Striped Bass', 'Largemouth Bass', 'Smallmouth Bass', 'Walleye'],
    primarySpecies: 'Striped Bass',
    bestMonths: [3, 4, 5, 10, 11],
    depths: { spring: { min: 15, max: 50, description: 'Stripers moving shallow' }, summer: { min: 30, max: 80, description: 'Following thermocline' }, fall: { min: 10, max: 40, description: 'Striper boils!' } },
    spawning: { 'Striped Bass': { months: [4, 5], location: 'Main channel 20-40 ft', behavior: 'Open water spawners' }, 'Largemouth Bass': { months: [4, 5], location: 'Back of canyons 3-8 ft', behavior: 'Nest builders' } },
    structure: [
      { type: 'Canyon Walls', description: 'Steep underwater structure', bestFor: ['Striped Bass', 'Smallmouth Bass'] },
      { type: 'Brush Piles', description: 'Submerged trees/brush', bestFor: ['Largemouth Bass', 'Black Crappie'] },
    ],
    hotspots: [
      { name: 'Wahweap Bay', description: 'Year-round striper action', species: ['Striped Bass'], coordinates: { lat: 37.015, lng: -111.485 } },
      { name: 'Good Hope Bay', description: 'Excellent bass fishing', species: ['Largemouth Bass', 'Smallmouth Bass'], coordinates: { lat: 37.575, lng: -110.685 } },
      { name: 'Bullfrog Marina', description: 'Striper boils in fall', species: ['Striped Bass'], coordinates: { lat: 37.520, lng: -110.730 } },
    ],
    regulations: 'Striped bass: unlimited harvest. No size limit.',
    tips: 'Striper boils in Oct-Nov are legendary. Follow the birds! Low water levels have changed patterns.',
  },
  'sand-hollow': {
    id: 'sand-hollow', name: 'Sand Hollow', region: 'Washington', elevation: 3000,
    coordinates: { lat: 37.1072, lng: -113.3850 }, // Sand Hollow State Park main boat ramp
    type: 'reservoir',
    species: ['Largemouth Bass', 'Bluegill', 'Rainbow Trout'],
    primarySpecies: 'Largemouth Bass',
    bestMonths: [3, 4, 5, 9, 10, 11],
    depths: { spring: { min: 3, max: 15, description: 'Bass spawning flats' }, summer: { min: 10, max: 30, description: 'Deeper structure' }, fall: { min: 5, max: 20, description: 'Cooling shallows' } },
    spawning: { 'Largemouth Bass': { months: [3, 4], location: 'Sandy shallows 3-8 ft', behavior: 'Early spring in warm Dixie climate' } },
    structure: [
      { type: 'Red Rock Ledges', description: 'Unique sandstone structure', bestFor: ['Largemouth Bass'] },
      { type: 'Sandy Flats', description: 'Spawning areas', bestFor: ['Largemouth Bass', 'Bluegill'] },
    ],
    hotspots: [
      { name: 'East Shore', description: 'Red rock bass habitat', species: ['Largemouth Bass'], coordinates: { lat: 37.110, lng: -113.370 } },
    ],
    regulations: 'Bass: 6 fish limit',
    tips: 'Dixie bass fishing year-round. Rainbow trout stocked Nov-Apr only.',
  },
  'sulfur-creek': {
    id: 'sulfur-creek', name: 'Sulfur Creek Reservoir', region: 'Summit (WY border)', elevation: 7550,
    coordinates: { lat: 41.095, lng: -110.955 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Cutthroat Trout'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [6, 7, 8, 9],
    depths: { spring: { min: 5, max: 15, description: 'Post ice-off shallows' }, summer: { min: 10, max: 25, description: 'Thermocline fishing' }, fall: { min: 8, max: 20, description: 'Pre-winter feed' } },
    spawning: { 'Rainbow Trout': { months: [5, 6], location: 'Inlet streams', behavior: 'Run up inlet creek' } },
    structure: [
      { type: 'Rocky Shoreline', description: 'Natural rock shelves', bestFor: ['Rainbow Trout'] },
      { type: 'Dam Face', description: 'Deepest water near dam', bestFor: ['Rainbow Trout', 'Cutthroat Trout'] },
    ],
    hotspots: [
      { name: 'North Inlet', description: 'Best shore fishing access', species: ['Rainbow Trout'], coordinates: { lat: 41.098, lng: -110.958 } },
    ],
    regulations: 'Trout: 4 fish limit, artificial flies and lures only',
    tips: 'Small high-altitude lake near Evanston, WY. Cold water year-round. Best when jet stream is overhead.',
  },
  'echo': {
    id: 'echo', name: 'Echo Reservoir', region: 'Summit', elevation: 5560,
    coordinates: { lat: 40.96, lng: -111.44 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Smallmouth Bass', 'Yellow Perch'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [5, 6, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Warming shallows' }, summer: { min: 15, max: 35, description: 'Deeper structure' }, fall: { min: 10, max: 25, description: 'Turnover feeding' } },
    spawning: {},
    structure: [
      { type: 'Dam Face', description: 'Deepest point, trout hold here in summer', bestFor: ['Rainbow Trout'] },
      { type: 'Inlet Channel', description: 'Weber River inlet — moving water', bestFor: ['Rainbow Trout', 'Smallmouth Bass'] },
    ],
    hotspots: [
      { name: 'Dam Area', description: 'Best for shore anglers', species: ['Rainbow Trout'], coordinates: { lat: 40.97, lng: -111.44 } },
    ],
    regulations: 'Standard Utah trout regs',
    tips: 'Popular I-80 corridor reservoir. Wind can pick up quickly through the canyon.',
  },
  'rockport': {
    id: 'rockport', name: 'Rockport Reservoir', region: 'Summit', elevation: 6020,
    coordinates: { lat: 40.78, lng: -111.39 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass', 'Yellow Perch'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [5, 6, 9, 10],
    depths: { spring: { min: 5, max: 20, description: 'Trout cruise warming shallows' }, summer: { min: 15, max: 40, description: 'Thermocline depth' }, fall: { min: 10, max: 30, description: 'Aggressive fall feed' } },
    spawning: { 'Brown Trout': { months: [10, 11], location: 'Weber River inlet', behavior: 'Run upstream to spawn' } },
    structure: [
      { type: 'Weber River Inlet', description: 'Moving water attracts trout', bestFor: ['Rainbow Trout', 'Brown Trout'] },
      { type: 'Submerged Points', description: 'Rocky structure holds bass', bestFor: ['Smallmouth Bass'] },
    ],
    hotspots: [
      { name: 'Weber Inlet', description: 'Best for trout year-round', species: ['Rainbow Trout', 'Brown Trout'], coordinates: { lat: 40.79, lng: -111.40 } },
    ],
    regulations: 'Standard Utah trout regs',
    tips: 'Excellent brown trout fishery. Fall spawn run can produce trophy fish.',
  },
  'east-canyon': {
    id: 'east-canyon', name: 'East Canyon Reservoir', region: 'Morgan', elevation: 5700,
    coordinates: { lat: 40.90, lng: -111.59 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Smallmouth Bass', 'Yellow Perch'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [5, 6, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Shallows warm first' }, summer: { min: 15, max: 35, description: 'Thermocline' }, fall: { min: 10, max: 25, description: 'Turnover zone' } },
    spawning: {},
    structure: [
      { type: 'Rocky Points', description: 'Bass ambush points', bestFor: ['Smallmouth Bass'] },
      { type: 'Dam Face', description: 'Deep water trout', bestFor: ['Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'East Shore Points', description: 'Bass and perch structure', species: ['Smallmouth Bass', 'Yellow Perch'], coordinates: { lat: 40.91, lng: -111.58 } },
    ],
    regulations: 'Standard Utah regs',
    tips: 'Close to SLC, can get crowded weekends. Early morning produces best.',
  },
  'hyrum': {
    id: 'hyrum', name: 'Hyrum Reservoir', region: 'Cache', elevation: 4670,
    coordinates: { lat: 41.64, lng: -111.86 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Bluegill', 'Yellow Perch'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [5, 6, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Warming flats' }, summer: { min: 10, max: 25, description: 'Deeper water' }, fall: { min: 8, max: 20, description: 'Fall feeding' } },
    spawning: {},
    structure: [
      { type: 'Weed Beds', description: 'Panfish habitat', bestFor: ['Bluegill', 'Yellow Perch'] },
    ],
    hotspots: [
      { name: 'State Park Shore', description: 'Easy access', species: ['Rainbow Trout'], coordinates: { lat: 41.64, lng: -111.86 } },
    ],
    regulations: 'Standard Utah regs',
    tips: 'Good family fishing with easy shore access. Stocked regularly.',
  },
  'otter-creek': {
    id: 'otter-creek', name: 'Otter Creek Reservoir', region: 'Piute', elevation: 6372,
    coordinates: { lat: 38.27, lng: -112.06 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Cutthroat Trout'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [5, 6, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Post ice-off shallows' }, summer: { min: 12, max: 30, description: 'Deeper water' }, fall: { min: 8, max: 20, description: 'Fall feed' } },
    spawning: {},
    structure: [
      { type: 'Weed Beds', description: 'Insect production zones', bestFor: ['Rainbow Trout'] },
      { type: 'Dam Face', description: 'Deep water', bestFor: ['Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'North End', description: 'Shallow productive flats', species: ['Rainbow Trout'], coordinates: { lat: 38.29, lng: -112.06 } },
    ],
    regulations: 'Standard Utah trout regs',
    tips: 'Remote south-central Utah. Great scenery, light pressure.',
  },
  'fish-lake': {
    id: 'fish-lake', name: 'Fish Lake', region: 'Sevier', elevation: 8848,
    coordinates: { lat: 38.54, lng: -111.72 }, type: 'natural_lake',
    species: ['Lake Trout', 'Splake', 'Rainbow Trout', 'Yellow Perch'],
    primarySpecies: 'Lake Trout',
    bestMonths: [6, 7, 8, 9],
    depths: { spring: { min: 10, max: 30, description: 'Post ice-off' }, summer: { min: 30, max: 80, description: 'Deep lake trout water' }, fall: { min: 20, max: 50, description: 'Fall turnover' } },
    spawning: { 'Lake Trout': { months: [10, 11], location: 'Rocky reefs in 20-40 ft', behavior: 'Spawn on rocky substrate' } },
    structure: [
      { type: 'Deep Reef', description: 'Underwater rock structure at 40-60 ft', bestFor: ['Lake Trout'] },
      { type: 'Weed Edges', description: 'Drop-offs from weed beds', bestFor: ['Rainbow Trout', 'Yellow Perch'] },
    ],
    hotspots: [
      { name: 'Twin Creeks', description: 'Inlet area, good shore fishing', species: ['Rainbow Trout'], coordinates: { lat: 38.55, lng: -111.73 } },
    ],
    regulations: 'Lake trout: No limit. Help remove invasive lakers.',
    tips: 'Utah\'s deepest natural lake. Troll deep for lakers, shore fish for rainbow.',
  },
  'piute': {
    id: 'piute', name: 'Piute Reservoir', region: 'Piute', elevation: 5900,
    coordinates: { lat: 38.33, lng: -112.14 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Brown Trout'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [4, 5, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Shallows' }, summer: { min: 10, max: 25, description: 'Deeper runs' }, fall: { min: 8, max: 20, description: 'Fall fishing' } },
    spawning: {},
    structure: [
      { type: 'Inlet Channel', description: 'Sevier River inflow', bestFor: ['Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'Dam Area', description: 'Deepest water', species: ['Rainbow Trout'], coordinates: { lat: 38.32, lng: -112.13 } },
    ],
    regulations: 'Standard Utah regs',
    tips: 'Small but productive. Light pressure, good scenery.',
  },
  'minersville': {
    id: 'minersville', name: 'Minersville Reservoir', region: 'Beaver', elevation: 5840,
    coordinates: { lat: 38.22, lng: -112.85 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Smallmouth Bass'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [4, 5, 10, 11],
    depths: { spring: { min: 5, max: 15, description: 'Warming shallows' }, summer: { min: 10, max: 25, description: 'Deeper' }, fall: { min: 8, max: 20, description: 'Cooling water' } },
    spawning: {},
    structure: [
      { type: 'Rocky Shores', description: 'Bass habitat', bestFor: ['Smallmouth Bass'] },
    ],
    hotspots: [
      { name: 'North Arm', description: 'Good shore access', species: ['Rainbow Trout'], coordinates: { lat: 38.23, lng: -112.85 } },
    ],
    regulations: 'Standard Utah regs',
    tips: 'Can produce big trout. Water levels vary significantly by year.',
  },
  'steinaker': {
    id: 'steinaker', name: 'Steinaker Reservoir', region: 'Uintah', elevation: 5510,
    coordinates: { lat: 40.52, lng: -109.53 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Largemouth Bass'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [4, 5, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Spring warming' }, summer: { min: 12, max: 30, description: 'Bass in structure' }, fall: { min: 8, max: 20, description: 'Fall feeding' } },
    spawning: { 'Largemouth Bass': { months: [5, 6], location: 'Shallow coves', behavior: 'Bed in warm shallows' } },
    structure: [
      { type: 'Coves', description: 'Protected bass habitat', bestFor: ['Largemouth Bass'] },
      { type: 'Dam Face', description: 'Deep trout water', bestFor: ['Rainbow Trout'] },
    ],
    hotspots: [
      { name: 'East Coves', description: 'Bass fishing', species: ['Largemouth Bass'], coordinates: { lat: 40.53, lng: -109.52 } },
    ],
    regulations: 'Standard Utah regs',
    tips: 'Near Vernal. Warm-water species do well here. Good ice fishing.',
  },
  'red-fleet': {
    id: 'red-fleet', name: 'Red Fleet Reservoir', region: 'Uintah', elevation: 5600,
    coordinates: { lat: 40.57, lng: -109.47 }, type: 'reservoir',
    species: ['Rainbow Trout', 'Brown Trout', 'Bluegill'],
    primarySpecies: 'Rainbow Trout',
    bestMonths: [5, 6, 9, 10],
    depths: { spring: { min: 5, max: 15, description: 'Post ice-off' }, summer: { min: 12, max: 30, description: 'Mid-depth structure' }, fall: { min: 8, max: 20, description: 'Cooling feed' } },
    spawning: {},
    structure: [
      { type: 'Red Rock Formations', description: 'Unique underwater geology', bestFor: ['Rainbow Trout', 'Bluegill'] },
    ],
    hotspots: [
      { name: 'Dinosaur Trackway', description: 'Famous red rock shore area', species: ['Rainbow Trout'], coordinates: { lat: 40.57, lng: -109.46 } },
    ],
    regulations: 'Standard Utah regs',
    tips: 'Beautiful red rock scenery. Famous for dinosaur tracks near shore.',
  },
  'quail-creek': {
    id: 'quail-creek', name: 'Quail Creek Reservoir', region: 'Washington', elevation: 3300,
    coordinates: { lat: 37.20, lng: -113.38 }, type: 'reservoir',
    species: ['Largemouth Bass', 'Bluegill', 'Rainbow Trout'],
    primarySpecies: 'Largemouth Bass',
    bestMonths: [3, 4, 5, 10, 11],
    depths: { spring: { min: 3, max: 12, description: 'Bass beds' }, summer: { min: 10, max: 25, description: 'Deeper structure' }, fall: { min: 5, max: 15, description: 'Fall flats' } },
    spawning: { 'Largemouth Bass': { months: [3, 4], location: 'Sandy coves', behavior: 'Early spring in Dixie warmth' } },
    structure: [
      { type: 'Sandy Coves', description: 'Bass spawning habitat', bestFor: ['Largemouth Bass'] },
    ],
    hotspots: [
      { name: 'Main Cove', description: 'Primary bass area', species: ['Largemouth Bass', 'Bluegill'], coordinates: { lat: 37.20, lng: -113.38 } },
    ],
    regulations: 'Standard Utah warm-water regs',
    tips: 'Dixie warm-water fishery. Year-round bass fishing in southern Utah.',
  },
};

// Legacy aliases — old IDs resolve to the correct segment
FISHING_LOCATIONS['provo-river'] = FISHING_LOCATIONS['provo-lower'];
FISHING_LOCATIONS['middle-provo'] = FISHING_LOCATIONS['provo-middle'];
FISHING_LOCATIONS['green-river'] = FISHING_LOCATIONS['green-a'];

function buildDefaultFishingLocation(locationId) {
  return {
    id: locationId,
    name: locationId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    region: 'Utah',
    elevation: null,
    coordinates: null,
    type: 'reservoir',
    species: [],
    primarySpecies: null,
    bestMonths: [],
    depths: {},
    spawning: {},
    structure: [],
    hotspots: [],
    regulations: null,
    tips: null,
    _isDefault: true,
  };
}

// Fish Species Data — temperature ranges, tactics by season, and recommended gear
const FISH_SPECIES = {
  'Rainbow Trout': {
    tempOptimal: [55, 65], tempStress: 70, icon: '🌈', color: 'text-pink-400',
    tactics: {
      spring: { method: 'Nymphing & dry-dropper rigs', flies: 'BWO #18-20, Pheasant Tail #16, RS2 #20-22', lures: 'Small Panther Martin, Kastmaster 1/8 oz', tip: 'Target gravel riffles during rainbow spawn; actively feeding pre-spawn fish hit nymphs aggressively' },
      summer: { method: 'Early morning dry flies, evening emergers', flies: 'PMD #16, Elk Hair Caddis #14-16, Adams #16', lures: 'Rooster Tail, small Rapala, PowerBait', tip: 'Fish before 9 AM or after 7 PM — rainbows stress above 68°F' },
      fall: { method: 'Streamers & nymphs, aggressive pre-winter feed', flies: 'Woolly Bugger #8-10, San Juan Worm, Zebra Midge #18-22', lures: 'Kastmaster, Blue Fox spinner', tip: 'Rainbows feed heavily before winter; strip streamers through pools' },
      winter: { method: 'Slow nymphing, ice fishing jigs', flies: 'Zebra Midge #20-24, Copper John #18, Thread Midge', lures: 'Ice jig + wax worm, small spoon', tip: 'Fish midday (10 AM–2 PM) when sun warms water 1-2 degrees' },
    },
  },
  'Brown Trout': {
    tempOptimal: [60, 70], tempStress: 75, icon: '🟤', color: 'text-amber-600',
    tactics: {
      spring: { method: 'Nymphing deep runs, streamer stripping', flies: 'Stonefly #8-12, Pat\'s Rubber Legs, Hare\'s Ear #14', lures: 'Rapala Countdown, gold spinner', tip: 'Browns are territorial post-spawn — swing streamers through deep pools' },
      summer: { method: 'Terrestrials midday, mouse patterns at dark', flies: 'Hopper #8-10, Ant #16, Beetle #14, Chubby Chernobyl #8', lures: 'Rebel Crickhopper, Mepps Aglia #2', tip: 'Big browns go nocturnal in summer; mouse patterns at dusk produce trophy fish' },
      fall: { method: 'Streamer fishing — pre-spawn aggression peaks', flies: 'Sculpin #4-6, Egg patterns, Articulated streamers', lures: 'Rapala, large Kastmaster, swimbait', tip: 'Oct-Nov is trophy season — males attack anything near their redds. Fish 45-min before/after sunset.' },
      winter: { method: 'Deep nymphing slow pools', flies: 'Zebra Midge #20, Blue Winged Olive #20-22, RS2', lures: 'Small jig, marabou jig', tip: 'Target 2-4 PM when weak BWO hatches bring even big browns to the surface' },
    },
  },
  'Cutthroat Trout': {
    tempOptimal: [39, 59], tempStress: 68, icon: '🔴', color: 'text-red-400',
    tactics: {
      spring: { method: 'Sight-fishing spawning cruisers in shallows', flies: 'Prince Nymph #14, Pheasant Tail, Egg #12', lures: 'Tube jig + worm tip, Kastmaster gold', tip: 'Post ice-off cutts cruise 5-15 ft — cast ahead of visible fish; they\'re less wary than browns' },
      summer: { method: 'Trolling or casting from float tube', flies: 'Damselfly #10, Callibaetis #16, Woolly Bugger olive', lures: 'Tube jig, wedding ring + worm, Rapala', tip: 'Cutthroat move to 20-40 ft thermocline; troll or vertical jig the drop-offs' },
      fall: { method: 'Aggressive feeding before ice-up', flies: 'Woolly Bugger #8, Leech pattern, Scud #16', lures: 'Kastmaster, Krocodile spoon, tube jig', tip: 'September-October is prime — cutts feed aggressively before winter shutdown' },
      winter: { method: 'Ice fishing with small jigs', flies: 'N/A — ice fishing', lures: 'Tube jig 1/32 oz + wax worm, Custom Jigs Ratso', tip: 'Set tip-ups at 15-25 ft near drop-offs; jig actively with small glow spoons' },
    },
  },
  'Lake Trout': { tempOptimal: [42, 55], tempStress: 65, icon: '⬛', color: 'text-slate-400',
    tactics: {
      spring: { method: 'Jigging near surface or trolling 20-40 ft', flies: 'N/A — too deep', lures: 'Tube jig white, Airplane jig, Flutter spoon', tip: 'Lakers are near surface in spring (40-60 ft) — this is your best shot without downriggers' },
      summer: { method: 'Deep trolling with downriggers 80-120 ft', flies: 'N/A', lures: 'Dodger + squid, J-plug, large spoon', tip: 'Summer means 80-120 ft with downriggers — follow your electronics for suspended schools' },
      fall: { method: 'Vertical jigging spawning structure 40-80 ft', flies: 'N/A', lures: 'Tube jig 1 oz, white bucktail jig, flutter spoon', tip: 'Oct-Nov lakers move to 40-80 ft rocky shoals to spawn — vertical jig right on structure' },
      winter: { method: 'Ice fishing or deep jigging', flies: 'N/A', lures: 'Airplane jig, dead cisco bait, tube jig', tip: 'Lakers feed actively under ice at Flaming Gorge — target 60-100 ft with big jigs' },
    },
  },
  'Kokanee Salmon': { tempOptimal: [50, 59], tempStress: 65, icon: '🔶', color: 'text-orange-400',
    tactics: {
      spring: { method: 'Trolling with dodger setups 15-30 ft', flies: 'N/A', lures: 'Wedding ring + shoepeg corn, small dodger + hoochie', tip: 'Kokanee school tight — once you find them, stay on that depth. Use color-coded dodgers (pink/orange).' },
      summer: { method: 'Trolling thermocline 30-50 ft', flies: 'N/A', lures: 'Dodger + kokanee bug, pink hoochie, wedding ring', tip: 'Follow the 52-55°F thermocline — kokanee won\'t leave it. Add tipped corn for scent.' },
      fall: { method: 'Snagging at tributaries (where legal), sight-fishing runs', flies: 'Egg patterns #10-12, flesh fly', lures: 'Snagging rig, small spoon near inlets', tip: 'Sept-Oct kokanee turn bright red and stage at tributary mouths — Sheep Creek, Strawberry River, Indian Creek' },
      winter: { method: 'N/A — kokanee are deep and dormant', flies: 'N/A', lures: 'N/A', tip: 'Kokanee are not viable ice fishing targets — focus on trout species instead' },
    },
  },
  'Largemouth Bass': { tempOptimal: [68, 78], tempStress: 85, icon: '🐟', color: 'text-green-500',
    tactics: {
      spring: { method: 'Sight-fishing beds, soft plastics', flies: 'Crawfish #4, Clouser minnow', lures: 'Texas-rigged worm, jig + trailer, Senko 5"', tip: 'Pre-spawn bass move shallow when water hits 58-62°F — slow-roll spinnerbaits along weed edges' },
      summer: { method: 'Topwater at dawn, deep cranks midday', flies: 'Popper #2, deer hair frog', lures: 'Frog, buzzbait, deep crankbait, drop shot', tip: 'Fish topwater in first 90 minutes of light, then switch to 10-15 ft structure with Texas rigs' },
      fall: { method: 'Following shad schools, reaction baits', flies: 'Clouser #4, Game Changer', lures: 'Spinnerbait, lipless crankbait, jerkbait', tip: 'Follow the shad — bass gorge in fall. Lipless crankbaits ripped through grass are deadly.' },
      winter: { method: 'Slow deep presentations', flies: 'N/A', lures: 'Jig + craw trailer, small jerkbait, drop shot', tip: 'Bass stack on the deepest available structure — work a football jig painfully slow on the bottom' },
    },
  },
  'Smallmouth Bass': { tempOptimal: [65, 75], tempStress: 80, icon: '🐟', color: 'text-emerald-500',
    tactics: {
      spring: { method: 'Drop shot on rocky points, sight-fishing nests', flies: 'Woolly Bugger olive #6, Clouser #4', lures: 'Drop shot + minnow, Ned rig, tube jig', tip: 'Jordanelle smallies move to 5-12 ft rocky flats in May — sight fish the nesting males' },
      summer: { method: 'Topwater early, drop shot midday on points', flies: 'Popper #6, crayfish pattern', lures: 'Whopper Plopper, drop shot, small swimbait', tip: 'Smallmouth are the most aggressive feeders in Utah — topwater is explosive on calm mornings' },
      fall: { method: 'Crankbaits and jerkbaits along rock transitions', flies: 'Sculpin #4, Clouser chartreuse', lures: 'Jerkbait, crankbait, football jig', tip: 'Fall smallmouth school up on main lake points 15-25 ft — cast and retrieve crankbaits parallel to ledges' },
      winter: { method: 'Deep finesse presentations', flies: 'N/A', lures: 'Drop shot, hair jig, blade bait', tip: 'Smallmouth go dormant but will still bite — work blade baits vertically on deep structure 30+ ft' },
    },
  },
  'Walleye': { tempOptimal: [65, 70], tempStress: 80, icon: '👁️', color: 'text-yellow-400',
    tactics: {
      spring: { method: 'Jigging spawning flats at night', flies: 'N/A', lures: 'Jig + minnow, Rapala Husky Jerk, crawler harness', tip: 'Walleye spawn at night on rocky flats 8-15 ft when water hits 45-50°F — Deer Creek dam area is prime' },
      summer: { method: 'Trolling crawler harnesses along weed edges', flies: 'N/A', lures: 'Crawler harness, bottom bouncer, crankbait', tip: 'Night fishing is king — walleye feed aggressively after dark on main lake points' },
      fall: { method: 'Jigging drop-offs, following shad', flies: 'N/A', lures: 'Blade bait, jig + minnow, Rapala', tip: 'Fall walleye school on structure 15-35 ft — vertical jig with blade baits for consistent action' },
      winter: { method: 'Ice fishing with tip-ups and jigging', flies: 'N/A', lures: 'Tip-up + minnow, jigging Rapala, glow spoon', tip: 'Ice fish 25-40 ft near old river channels; use tip-ups with live minnows and jig a Rapala nearby' },
    },
  },
  'Channel Catfish': { tempOptimal: [65, 76], tempStress: 90, icon: '🐱', color: 'text-slate-500',
    tactics: {
      spring: { method: 'Bottom rigs in warming shallows', flies: 'N/A', lures: 'Circle hook + chicken liver, stink bait, worm', tip: 'Catfish move shallow when water passes 60°F — fish rip-rap and river mouths at dusk' },
      summer: { method: 'Night fishing with cut bait', flies: 'N/A', lures: 'Cut carp, chicken liver, nightcrawler on circle hook', tip: 'Summer cats are most active 9 PM to midnight — Lincoln Beach rip-rap at Utah Lake is legendary' },
      fall: { method: 'Pre-winter feed, aggressive on cut bait', flies: 'N/A', lures: 'Cut shad, stink bait, nightcrawlers', tip: 'Channel cats gorge before winter — fish river mouths where they\'re intercepting baitfish' },
      winter: { method: 'Slow deep presentations', flies: 'N/A', lures: 'Cut bait on bottom, nightcrawler', tip: 'Cats get sluggish below 45°F but can still be caught — use fresh cut bait fished slow on bottom' },
    },
  },
  'Yellow Perch': { tempOptimal: [63, 72], tempStress: 78, icon: '🟡', color: 'text-yellow-500' },
  'Tiger Muskie': { tempOptimal: [60, 70], tempStress: 80, icon: '🐯', color: 'text-orange-500',
    tactics: {
      spring: { method: 'Casting large baits along weed edges', flies: 'Large streamer #2/0', lures: 'Large swimbait, jerkbait 6"+, bucktail spinner', tip: 'Post ice-off muskies cruise weed flats 5-15 ft — cast big and retrieve steady along vegetation edges' },
      summer: { method: 'Figure-8 at boatside, weed edge patrol', flies: 'N/A — too large', lures: 'Bulldawg, Suick, large topwater', tip: 'Muskies follow but don\'t always commit — ALWAYS figure-8 at the boat. Evening is prime.' },
      fall: { method: 'Trophy season — big baits, deep structure', flies: 'N/A', lures: 'Large crankbait, medusa jig, live sucker (where legal)', tip: 'Oct-Nov is when state record fish are caught — throw the biggest baits you own along deep weed transitions' },
      winter: { method: 'Slow deep jigging near last-known fall locations', flies: 'N/A', lures: 'Sucker rig, large jigging spoon', tip: 'Winter muskies are rare catches but monsters — fish slow near their fall haunts' },
    },
  },
  'White Bass': { tempOptimal: [65, 75], tempStress: 85, icon: '⚪', color: 'text-slate-300',
    tactics: {
      spring: { method: 'Intercept spawning runs at river mouths', flies: 'Clouser minnow white #6', lures: 'Roadrunner jig, small crankbait, inline spinner', tip: 'The May white bass run up Provo River is one of Utah\'s best fishing events — nonstop action on small jigs' },
      summer: { method: 'Follow surface boils, cast into schools', flies: 'Clouser, small streamer', lures: 'Kastmaster, small spoon, grub on jighead', tip: 'Watch for bird activity — white bass push shad to surface creating visible boils' },
      fall: { method: 'School fishing near main lake points', flies: 'Small Clouser', lures: 'Spoon, inline spinner, small crankbait', tip: 'White bass school tight in fall — when you find one, you find hundreds. Keep casting into the school.' },
      winter: { method: 'Deep jigging on bottom structure', flies: 'N/A', lures: 'Small jig + minnow, blade bait', tip: 'White bass go deep (10-14 ft at Utah Lake) — vertical jig near river channels' },
    },
  },
  'Black Crappie': { tempOptimal: [60, 70], tempStress: 80, icon: '⚫', color: 'text-slate-600' },
  'Mountain Whitefish': { tempOptimal: [45, 55], tempStress: 65, icon: '🐟', color: 'text-blue-300' },
  'Wiper': { tempOptimal: [65, 75], tempStress: 85, icon: '⚡', color: 'text-cyan-500',
    tactics: {
      spring: { method: 'Casting to surface feeding schools', flies: 'Clouser #4, Deceiver', lures: 'Kastmaster, topwater walker, lipless crankbait', tip: 'Wipers are the hardest fighting fish in Utah — find shad schools and cast into the frenzy' },
      summer: { method: 'Surface boils early/late, trolling midday', flies: 'N/A', lures: 'Topwater, Kastmaster, trolling spoon', tip: 'Dawn and dusk surface feeds at Willard Bay are explosive — watch for bird activity marking schools' },
      fall: { method: 'Aggressive feeding before winter', flies: 'Large Clouser', lures: 'Jerkbait, swimbait, Kastmaster', tip: 'Wipers school tight and feed aggressively in fall — fast retrieve along rip-rap and dikes' },
      winter: { method: 'Slow deep jigging', flies: 'N/A', lures: 'Blade bait, jigging spoon', tip: 'Winter wipers are tough but catchable — find them with electronics and vertical jig slowly' },
    },
  },
  'Northern Pike': { tempOptimal: [55, 70], tempStress: 80, icon: '🐊', color: 'text-green-600' },
  'Tiger Trout': { tempOptimal: [50, 62], tempStress: 70, icon: '🐯', color: 'text-amber-500' },
  'Splake': { tempOptimal: [42, 55], tempStress: 65, icon: '❄️', color: 'text-cyan-400' },
  'Bluegill': { tempOptimal: [68, 78], tempStress: 85, icon: '🔵', color: 'text-blue-500' },
  'Striped Bass': { tempOptimal: [65, 75], tempStress: 82, icon: '🦈', color: 'text-slate-400',
    tactics: {
      spring: { method: 'Trolling main channels 20-40 ft', flies: 'N/A', lures: 'Umbrella rig, large swimbait, deep crankbait', tip: 'Spring stripers at Powell move to 20-40 ft following shad — trolling is most effective' },
      summer: { method: 'Night fishing, deep trolling by day', flies: 'N/A', lures: 'Topwater popper, live shad, deep spoon', tip: 'Summer stripers go 50-80 ft in daylight — focus on dawn/dusk surface feeds in canyon narrows' },
      fall: { method: 'Surface boils — the legendary striper boils', flies: 'Deceiver #1/0', lures: 'Topwater, Kastmaster, jerkbait, spoon', tip: 'Oct-Nov striper boils at Powell are a bucket-list fishing experience — follow the birds, cast into the chaos' },
      winter: { method: 'Vertical jigging deep structure', flies: 'N/A', lures: 'Slab spoon, jigging Rapala, live shad', tip: 'Winter stripers suspend 40-60 ft near dam areas — find them on electronics and jig vertically' },
    },
  },
  'Burbot': { tempOptimal: [35, 45], tempStress: 55, icon: '🐍', color: 'text-amber-700' },
  'Bonneville Cisco': { tempOptimal: [35, 42], tempStress: 50, icon: '✨', color: 'text-sky-300' },
};

// Utah Aquatic Insect Hatch Calendar — what's hatching by month
// This drives fly recommendations for river anglers
const HATCH_CALENDAR = {
  1:  { primary: null, note: 'Dead of winter — midges only in tailwaters' },
  2:  { primary: { name: 'Midges', size: '#20-24', pattern: 'Zebra Midge, Thread Midge, Griffith\'s Gnat', water: 'Tailwaters only' },
       note: 'Late Feb midges start on the Provo & Green. Fish 11 AM–2 PM.' },
  3:  { primary: { name: 'Blue Winged Olives (BWO)', size: '#18-22', pattern: 'Parachute BWO, RS2, Barr\'s Emerger', water: 'Provo River, Green River' },
       secondary: { name: 'Midges', size: '#20-24', pattern: 'Zebra Midge, WD-40' },
       note: 'The BWO hatch begins — overcast days with light drizzle produce the best dry fly fishing of the year.' },
  4:  { primary: { name: 'Blue Winged Olives (BWO)', size: '#16-20', pattern: 'Parachute BWO, Sparkle Dun, RS2', water: 'Provo River, Green River, all tailwaters' },
       secondary: { name: 'Early Stoneflies', size: '#12-16', pattern: 'Pat\'s Rubber Legs, Hare\'s Ear', water: 'Provo River upper, freestone streams' },
       note: 'April is peak BWO month. Fish afternoons 1-4 PM. Match the size precisely — trout get selective.' },
  5:  { primary: { name: 'Pale Morning Duns (PMD)', size: '#16-18', pattern: 'PMD Emerger, Sparkle Dun, Pheasant Tail', water: 'Green River, Provo River' },
       secondary: { name: 'Caddis', size: '#14-16', pattern: 'Elk Hair Caddis, X-Caddis, LaFontaine Sparkle Pupa', water: 'All rivers' },
       tertiary: { name: 'Golden Stoneflies', size: '#6-8', pattern: 'Pat\'s Rubber Legs, Stimulator', water: 'Provo River upper sections' },
       note: 'May is prime time — hatches overlap and fish are greedy. Dry-dropper rigs (caddis + nymph) are deadly.' },
  6:  { primary: { name: 'PMDs + Caddis', size: '#14-18', pattern: 'PMD, Elk Hair Caddis, Adams', water: 'All rivers and stillwaters' },
       secondary: { name: 'Cicadas (Green River)', size: '#4-8', pattern: 'Foam Cicada, Club Sandwich', water: 'Green River A & B sections' },
       tertiary: { name: 'Damselflies (lakes)', size: '#10-12', pattern: 'Damsel Nymph, Marabou Damsel', water: 'Stillwaters — Strawberry, Scofield' },
       note: 'June cicada hatch on the Green River is LEGENDARY — trophy browns eat them on the surface all day. Plan a trip.' },
  7:  { primary: { name: 'Terrestrials begin', size: '#8-14', pattern: 'Hopper, Ant, Beetle, Chubby Chernobyl', water: 'All rivers and streams' },
       secondary: { name: 'Tricos', size: '#20-24', pattern: 'Trico Spinner, CDC Trico, Parachute Trico', water: 'Green River, lower Provo' },
       tertiary: { name: 'Callibaetis (lakes)', size: '#14-16', pattern: 'Callibaetis Nymph, Parachute Callibaetis', water: 'Stillwaters' },
       note: 'Hopper-dropper season is here. Big foam hoppers with a bead-head nymph underneath — covers all bases.' },
  8:  { primary: { name: 'Terrestrials peak', size: '#8-12', pattern: 'Hopper, Ant, Beetle, Stimulator', water: 'All moving water' },
       secondary: { name: 'Tricos', size: '#20-24', pattern: 'Trico Spinner', water: 'Green River, Provo River' },
       note: 'August is hopper heaven. Windy afternoons actually help — wind blows grasshoppers into the water.' },
  9:  { primary: { name: 'Blue Winged Olives (fall BWO)', size: '#18-22', pattern: 'Parachute BWO, RS2, WD-40', water: 'All tailwaters' },
       secondary: { name: 'Late Terrestrials', size: '#10-14', pattern: 'Ant, Beetle, small hopper', water: 'Streams & rivers' },
       tertiary: { name: 'Kokanee spawn at tributaries', size: 'Egg patterns #10-12', pattern: 'Glo-Bug, Sucker Spawn', water: 'Below kokanee spawning tributaries' },
       note: 'Fall BWOs restart. Browns begin pre-spawn aggression — streamers start producing trophy fish.' },
  10: { primary: { name: 'Blue Winged Olives + Streamers', size: '#18-22 BWO, #4-8 streamers', pattern: 'BWO, Sculpin, Articulated streamer, Egg', water: 'Provo River, Green River' },
       note: 'October is TROPHY month. Brown trout spawn — fish are aggressive and territorial. Streamer fishing is at its best.' },
  11: { primary: { name: 'Midges + Late BWO', size: '#20-24', pattern: 'Zebra Midge, BWO, Egg patterns', water: 'Tailwaters' },
       note: 'Season winding down but tailwaters still produce. Afternoon midge hatches can be excellent on warm days.' },
  12: { primary: { name: 'Midges', size: '#22-26', pattern: 'Zebra Midge, Thread Midge, Griffith\'s Gnat', water: 'Green River, lower Provo' },
       note: 'Winter fishing begins. Tiny midges on tailwaters — delicate tippet (6X-7X) required.' },
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

function degreesToCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
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
  factors.push({ name: 'Pressure', value: `${safeToFixed(pressure, 2)} inHg`, impact: pressureScore >= 16 ? 'positive' : pressureScore <= 8 ? 'negative' : 'neutral' });
  
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
  const windDirLabel = conditions.windDirection ? (typeof conditions.windDirection === 'number' ? degreesToCompass(conditions.windDirection) : conditions.windDirection) : '';
  factors.push({ name: 'Wind', value: windDirLabel ? `${windDirLabel} ${safeToFixed(windSpeed, 0)} mph` : `${safeToFixed(windSpeed, 0)} mph`, impact: windScore >= 12 ? 'positive' : windScore <= 5 ? 'negative' : 'neutral' });
  
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

// Main Fishing Mode Component
const FishingMode = ({ windData, pressureData, isLoading: _isLoading, upstreamData = {}, hourlyForecast, selectedLocation = 'strawberry', isPro = false, onUnlockPro }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const location = FISHING_LOCATIONS[selectedLocation] || buildDefaultFishingLocation(selectedLocation);
  const recentlyStocked = useMemo(() => {
    const list = stockingData?.stocked || [];
    return list.includes(selectedLocation) || list.some(id => selectedLocation.startsWith(id + '-') || id.startsWith(selectedLocation + '-'));
  }, [selectedLocation]);
  const season = getCurrentSeason();
  const moonPhase = getMoonPhase();
  const solunar = getSolunarPeriods();
  const currentHour = new Date().getHours();
  
  // Get conditions
  const windSpeed = windData?.stations?.[0]?.speed || windData?.speed || 5;
  const windDirection = windData?.stations?.[0]?.direction;
  const pressure = pressureData?.slcPressure || 30.0;
  const pressureTrend = pressureData?.gradient > 0 ? 'rising' : pressureData?.gradient < 0 ? 'falling' : 'stable';

  const vernacularLabels = useMemo(() => getUtahVernacular({
    locationId: selectedLocation,
    hour: currentHour,
    windSpeed,
    windDirection,
    pressureGradient: pressureData?.gradient,
    pressureTrend,
    pressure,
  }), [selectedLocation, currentHour, windSpeed, windDirection, pressureData?.gradient, pressureTrend, pressure]);

  const preFrontalBite = vernacularLabels.find(v => v.fishingBoost);
  const activeVernacular = vernacularLabels.length > 0 ? vernacularLabels[0] : null;

  // Fetch all USGS water temps and river flows once
  const [allWaterTemps, setAllWaterTemps] = useState({});
  const [allRiverFlows, setAllRiverFlows] = useState({});
  useEffect(() => {
    getAllWaterTemps().then(setAllWaterTemps).catch(() => {});
    getAllRiverFlows().then(setAllRiverFlows).catch(() => {});
  }, []);

  const waterTempData = allWaterTemps[selectedLocation] || null;

  const waterTemp = useMemo(() => {
    if (waterTempData?.tempF != null && !waterTempData.stale) {
      return waterTempData.tempF;
    }
    // Fallback: seasonal estimate
    const baseTemp = { spring: 50, summer: 65, fall: 55, winter: 38 }[season];
    const elev = location?.elevation ?? 5000;
    const elevationAdjust = (elev - 5000) / 1000 * -3;
    return Math.round(baseTemp + elevationAdjust);
  }, [waterTempData, season, location?.elevation]);

  const waterTempSource = waterTempData?.source === 'USGS' ? 'usgs'
    : waterTempData?.source === 'Satellite Avg' ? 'satellite-avg'
    : 'estimate';

  const fishingScore = calculateFishingScore(selectedLocation, {
    pressure,
    pressureTrend,
    windSpeed,
    windDirection,
    waterTemp,
    moonPhase,
    hour: currentHour,
  });
  
  const pressureAnalysis = analyzePressure(pressure, pressureTrend);
  const depthInfo = location?.depths?.[season] || { min: 10, max: 30, description: 'Variable' };

  // Learned model prediction
  const aiPrediction = useMemo(() => {
    try {
      return predictFishing(
        { speed: windSpeed, temperature: waterTemp },
        { slcPressure: pressure, pressure },
      );
    } catch (_e) { return null; }
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

    // Pre-Frontal Bite overrides other badges when active
    const preFrontBadge = preFrontalBite
      ? { text: 'PRE-FRONTAL BITE', color: isDark ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50 animate-pulse' : 'bg-purple-100 text-purple-700 border border-purple-300 animate-pulse' }
      : null;

    // Currently a great time
    if (score >= 70 || goldenHour || solunarActive || preFrontalBite) {
      const reasons = [];
      if (preFrontalBite) reasons.push('Pre-Frontal Bite');
      if (goldenHour) reasons.push('Golden Hour');
      if (solunarActive) reasons.push(`${solunarActive} Solunar`);
      if (pressureFalling && !preFrontalBite) reasons.push('Falling Pressure');
      if (moonGood) reasons.push('Strong Moon Phase');
      return {
        color: 'green',
        headline: preFrontalBite ? 'Pre-Frontal Bite — Fish Now!' : 'Fish Are Biting!',
        subline: reasons.length > 0 ? reasons.join(' + ') : `${score}% activity — conditions are excellent`,
        displayScore: Math.max(score, aiProb, preFrontalBite ? 75 : 0),
        badge: preFrontBadge
          || (goldenHour ? { text: 'GOLDEN HOUR', color: 'bg-amber-500 text-white animate-pulse' }
          : solunarActive ? { text: 'SOLUNAR', color: 'bg-green-500 text-white animate-pulse' }
          : { text: 'GO FISH', color: 'bg-green-500 text-white' }),
        vernacular: vernacularLabels,
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
          preFrontalBite ? 'Pre-Frontal Bite — fish feeding aggressively' : null,
          moonGood ? 'Strong moon' : null,
          pressureFalling ? 'Falling pressure (active fish)' : null,
          aiPrediction?.recommendation,
        ].filter(Boolean)[0] || `${aiProb}% activity predicted`,
        displayScore: aiProb,
        badge: preFrontBadge || { text: 'PREDICTED', color: aiProb >= 60
          ? (isDark ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-green-100 text-green-700 border border-green-300')
          : (isDark ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-yellow-100 text-yellow-700 border border-yellow-300') },
        arriveBy: nextGoodHour,
        vernacular: vernacularLabels,
      };
    }

    return {
      color: score >= 50 ? 'yellow' : 'red',
      headline: activeVernacular ? `${location.name} — ${activeVernacular.label}` : `${location.name} — ${fishingScore.recommendation}`,
      subline: activeVernacular ? activeVernacular.description : 'Monitoring conditions',
      displayScore: score,
      badge: preFrontBadge,
      vernacular: vernacularLabels,
    };
  }, [fishingScore, aiPrediction, location, isDark, preFrontalBite, activeVernacular, vernacularLabels]);

  // ── Sky condition + cloud cover for recommendations ──
  const { currentSky, currentCloudCover } = useMemo(() => {
    const now = new Date();
    const currentHourObj = hourlyForecast?.find(h => {
      if (h.time) {
        const dt = new Date(h.time);
        return dt.getHours() === now.getHours();
      }
      return false;
    }) || hourlyForecast?.[0];
    const skyText = currentHourObj?.shortForecast || currentHourObj?.text || '';
    return {
      currentSky: parseSkyCondition(skyText),
      currentCloudCover: currentHourObj?.cloudCover ?? null,
    };
  }, [hourlyForecast]);

  // ── Dynamic Weather-Tied Hatch Triggers ──
  const weatherHatchTriggers = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const triggers = [];

    const isSpringFall = (month >= 3 && month <= 5) || (month >= 9 && month <= 11);
    const isSummer = month >= 6 && month <= 8;

    const effectiveCloudCover = currentCloudCover ?? (
      currentSky === 'overcast' ? 90 : currentSky === 'cloudy' ? 75 : currentSky === 'partly' ? 40 : 10
    );

    if (isSpringFall && effectiveCloudCover > 65) {
      triggers.push({
        id: 'bwo-hatch',
        label: 'BWO Hatch Highly Likely',
        detail: `Cloud cover ${effectiveCloudCover}% — ideal conditions for Blue Winged Olives. Baetis love low light.`,
        badge: 'LIVE WEATHER MATCH',
        icon: '🪰',
        color: 'emerald',
        flyKey: 'bwo',
        priority: 1,
      });
    }

    if (isSummer && windSpeed > 8) {
      triggers.push({
        id: 'hopper-wind',
        label: 'Hoppers Blown Into Water',
        detail: `Wind ${Math.round(windSpeed)} mph — breezy conditions blowing terrestrials into the water. Throw Hoppers.`,
        badge: 'LIVE WEATHER MATCH',
        icon: '🦗',
        color: 'amber',
        flyKey: 'hopper',
        priority: 2,
      });
    }

    return triggers;
  }, [currentSky, currentCloudCover, windSpeed]);

  // ── Daily Fly Recommendation ──
  const flyPick = useMemo(() => {
    const now = new Date();
    return getDailyFlyPick({
      month: now.getMonth() + 1,
      waterTemp,
      windSpeed,
      skyCondition: currentSky,
      pressure,
      pressureTrend,
      hour: now.getHours(),
      locationId: selectedLocation,
      locationType: location.type,
      cloudCover: currentCloudCover,
    });
  }, [currentSky, currentCloudCover, waterTemp, windSpeed, pressure, pressureTrend, selectedLocation, location.type]);

  // ── Daily Lure/Bait Recommendation ──
  const lurePick = useMemo(() => {
    const now = new Date();
    return getDailyLurePick({
      month: now.getMonth() + 1,
      waterTemp,
      windSpeed,
      sky: currentSky,
      pressureTrend,
      hour: now.getHours(),
      locationId: selectedLocation,
      species: location.species,
      locationType: location.type,
    });
  }, [currentSky, waterTemp, windSpeed, pressureTrend, selectedLocation, location.species, location.type]);

  // ── Shore Strategy ──
  const shoreAdvice = useMemo(() => {
    if (location.type === 'river') return null;
    const windDir = windData?.stations?.[0]?.direction || 'SW';
    return getShoreStrategy(location, windDir, windSpeed, location.species);
  }, [location, windData, windSpeed]);

  // ── Method Tab State ──
  const [activeMethodTab, setActiveMethodTab] = useState('all');

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
      {location._isDefault && (
        <div className={`rounded-xl p-3 border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            Fishing data coming soon for {location.name}
          </div>
          <div className={`text-xs mt-1 ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>
            Wind, pressure, and general conditions are still available below.
          </div>
        </div>
      )}
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
            <div className="flex items-center gap-2">
              <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{location.name}</p>
              {recentlyStocked && (
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm shadow-cyan-500/30">
                  🐟 RECENTLY STOCKED
                </span>
              )}
            </div>
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

      {/* Recently Stocked Callout */}
      {recentlyStocked && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-cyan-50 border-cyan-300'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-cyan-500/25' : 'bg-cyan-200'}`}>
              <span className="text-xl">🐟</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>Recently Stocked by Utah DWR</span>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50' : 'bg-cyan-200 text-cyan-800 border border-cyan-400'}`}>
                  CHEAT CODE
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-cyan-300/70' : 'text-cyan-700'}`}>
                This water was stocked within the last 7–14 days. Fresh planters are aggressive and willing biters — adjust tactics accordingly.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Utah Weather Vernacular Badges */}
      {vernacularLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {vernacularLabels.map((v, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                v.fishingBoost
                  ? (isDark ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700')
                  : v.label === 'Canyon Winds Expected'
                    ? (isDark ? 'bg-sky-500/15 border-sky-500/40 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700')
                    : (isDark ? 'bg-orange-500/15 border-orange-500/40 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700')
              }`}
            >
              <span className="text-base">{v.icon}</span>
              <div>
                <div className="font-bold text-xs">{v.label}</div>
                <div className={`text-[11px] ${isDark ? 'opacity-70' : 'opacity-60'}`}>{v.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hatch Calendar — What's Hatching Now (Rivers) */}
      {(location.type === 'river' || ['deer-creek', 'strawberry', 'scofield'].includes(selectedLocation)) && (() => {
        const currentMonth = new Date().getMonth() + 1;
        const hatch = HATCH_CALENDAR[currentMonth];
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const isRelevant = (waterField) => {
          if (!waterField) return false;
          const lower = waterField.toLowerCase();
          return lower.includes('all') || lower.includes(location.name.toLowerCase().split(' ')[0]);
        };
        return hatch ? (
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 shadow-sm'}`}>
            <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              🪰 Hatch Calendar — {monthNames[currentMonth - 1]} at {location.name}
            </h3>
            {hatch.primary && (
              <div className={`p-3 rounded-lg mb-2 ${isRelevant(hatch.primary.water) ? (isDark ? 'bg-emerald-500/15 border border-emerald-400/40' : 'bg-emerald-50 border border-emerald-300') : (isDark ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-white border border-emerald-200')}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                    {hatch.primary.name}
                    {isRelevant(hatch.primary.water) && <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-200 text-emerald-800'}`}>AT YOUR WATER</span>}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    {hatch.primary.size}
                  </span>
                </div>
                <div className={`text-xs mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span className="font-medium">Patterns:</span> {hatch.primary.pattern}
                </div>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{hatch.primary.water}</div>
              </div>
            )}
            {hatch.secondary && (
              <div className={`p-2.5 rounded-lg mb-2 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{hatch.secondary.name}</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{hatch.secondary.size}</span>
                </div>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{hatch.secondary.pattern}</div>
              </div>
            )}
            {hatch.tertiary && (
              <div className={`p-2.5 rounded-lg mb-2 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{hatch.tertiary.name}</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{hatch.tertiary.size}</span>
                </div>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{hatch.tertiary.pattern}</div>
              </div>
            )}
            <div className={`text-xs mt-2 italic ${isDark ? 'text-emerald-300/70' : 'text-emerald-700/80'}`}>{hatch.note}</div>
            <div className={`flex gap-2 mt-3 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>← {monthNames[prevMonth - 1]}: {HATCH_CALENDAR[prevMonth]?.primary?.name || 'Midges'}</span>
              <span className="flex-1" />
              <span>{monthNames[nextMonth - 1]}: {HATCH_CALENDAR[nextMonth]?.primary?.name || 'Midges'} →</span>
            </div>
          </div>
        ) : null;
      })()}

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

      {/* ═══════ PRO TEASER — Solunar/Pressure Insight ═══════ */}
      {!isPro && (
        <ProTeaser
          variant="auto"
          context={{
            hasPressureData: !!pressureData,
            hasSolunarData: !!solunar,
            hasWaterTemp: !!waterTemp,
            isGlassConditions: windSpeed < 5,
            isFlyFishing: location.type === 'river',
          }}
          onUnlock={onUnlockPro}
        />
      )}

      {/* River Conditions — shown for river locations with USGS flow data */}
      {location.type === 'river' && (() => {
        const flow = allRiverFlows[selectedLocation];
        const temp = allWaterTemps[selectedLocation];
        if (!flow && !temp) return null;
        const cfs = flow?.dischargeCfs;
        const gage = flow?.gageHeightFt;
        const status = getRiverFlowStatus(selectedLocation, cfs);

        const SEVERITY_STYLES = {
          great:   { bg: isDark ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300', text: isDark ? 'text-emerald-400' : 'text-emerald-600', badge: isDark ? 'bg-emerald-500/25 text-emerald-400' : 'bg-emerald-100 text-emerald-700' },
          good:    { bg: isDark ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-cyan-50 border-cyan-300', text: isDark ? 'text-cyan-400' : 'text-cyan-600', badge: isDark ? 'bg-cyan-500/25 text-cyan-400' : 'bg-cyan-100 text-cyan-700' },
          ok:      { bg: isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-300', text: isDark ? 'text-slate-400' : 'text-slate-500', badge: isDark ? 'bg-slate-600/40 text-slate-400' : 'bg-slate-200 text-slate-600' },
          caution: { bg: isDark ? 'bg-amber-500/15 border-amber-500/40' : 'bg-amber-50 border-amber-300', text: isDark ? 'text-amber-400' : 'text-amber-600', badge: isDark ? 'bg-amber-500/25 text-amber-400' : 'bg-amber-100 text-amber-700' },
          warning: { bg: isDark ? 'bg-orange-500/15 border-orange-500/40' : 'bg-orange-50 border-orange-300', text: isDark ? 'text-orange-400' : 'text-orange-600', badge: isDark ? 'bg-orange-500/25 text-orange-400' : 'bg-orange-100 text-orange-700' },
          danger:  { bg: isDark ? 'bg-red-500/15 border-red-500/40' : 'bg-red-50 border-red-300', text: isDark ? 'text-red-400' : 'text-red-600', badge: isDark ? 'bg-red-500/25 text-red-400' : 'bg-red-100 text-red-700' },
        };
        const sev = status ? SEVERITY_STYLES[status.severity] || SEVERITY_STYLES.ok : SEVERITY_STYLES.ok;

        const updatedAgo = flow?.dateTime ? (() => {
          const mins = Math.round((Date.now() - new Date(flow.dateTime).getTime()) / 60000);
          return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
        })() : null;

        return (
          <div className={`rounded-xl p-4 border ${sev.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                <Waves className="w-4 h-4 text-cyan-400" />
                River Conditions — {location.name}
              </h3>
              <div className="flex items-center gap-2">
                {status && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.badge}`}>
                    {status.label}
                  </span>
                )}
                <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">USGS LIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {cfs != null && (
                <div>
                  <div className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Flow Rate</div>
                  {status?.dataDelayed ? (
                    <>
                      <div className={`text-lg font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Delayed</div>
                      <div className={`text-[10px] ${isDark ? 'text-amber-400/70' : 'text-amber-600/70'}`}>USGS updating</div>
                    </>
                  ) : (
                    <>
                      <div className={`text-3xl font-black ${sev.text}`}>
                        {Math.round(cfs)}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>cfs</div>
                    </>
                  )}
                </div>
              )}
              {gage != null && (
                <div>
                  <div className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gage Height</div>
                  <div className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {gage.toFixed(2)}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ft</div>
                </div>
              )}
              {temp?.tempF != null && (
                <div>
                  <div className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Water Temp</div>
                  <div className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {temp.tempF}°
                  </div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>°F</div>
                </div>
              )}
            </div>

            {(status?.severity === 'danger' || status?.severity === 'warning') && (
              <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 text-xs ${
                status.severity === 'danger'
                  ? (isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700')
                  : (isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700')
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {status.severity === 'danger'
                  ? 'Flows are dangerously high. Do not wade. Check conditions before floating.'
                  : 'Elevated flows — wading is difficult. Consider drift boat or wait for flows to drop.'}
              </div>
            )}

            <div className={`flex items-center justify-between mt-3 pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {flow?.sourceName || temp?.sourceName} • USGS
              </div>
              {updatedAgo && (
                <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Updated {updatedAgo}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════ WEATHER-TRIGGERED HATCH ALERTS ═══════ */}
      {weatherHatchTriggers.length > 0 && (
        <div className="space-y-2">
          {weatherHatchTriggers.map(trigger => (
            <div
              key={trigger.id}
              className={`rounded-xl border p-4 ${
                trigger.color === 'emerald'
                  ? (isDark ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300')
                  : (isDark ? 'bg-amber-500/15 border-amber-500/40' : 'bg-amber-50 border-amber-300')
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{trigger.icon}</span>
                  <span className={`text-sm font-bold ${
                    trigger.color === 'emerald'
                      ? (isDark ? 'text-emerald-300' : 'text-emerald-800')
                      : (isDark ? 'text-amber-300' : 'text-amber-800')
                  }`}>
                    {trigger.label}
                  </span>
                </div>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse ${
                  trigger.color === 'emerald'
                    ? (isDark ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-200 text-emerald-800 border border-emerald-400')
                    : (isDark ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'bg-amber-200 text-amber-800 border border-amber-400')
                }`}>
                  {trigger.badge}
                </span>
              </div>
              <p className={`text-xs ${
                trigger.color === 'emerald'
                  ? (isDark ? 'text-emerald-300/80' : 'text-emerald-700')
                  : (isDark ? 'text-amber-300/80' : 'text-amber-700')
              }`}>
                {trigger.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ TODAY'S GAME PLAN (Lure Selection) ═══════ */}
      {lurePick?.topPick && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gradient-to-br from-amber-900/20 to-slate-800/50 border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-sm'}`}>
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                <Crosshair className="w-4 h-4" />
                Today's Game Plan
              </h3>
              <div className="flex items-center gap-2">
                {lurePick.bassPattern && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-green-500/25 text-green-400' : 'bg-green-100 text-green-700'}`}>
                    {lurePick.bassPattern.label.toUpperCase()}
                  </span>
                )}
                {lurePick.walleyePattern && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-500/25 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                    {lurePick.walleyePattern.label.toUpperCase()}
                  </span>
                )}
                {lurePick.colorRecommendation && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    Color: {lurePick.colorRecommendation.primary}
                  </span>
                )}
                {lurePick.artificialOnly && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    ARTIFICIAL ONLY
                  </span>
                )}
              </div>
            </div>

            {/* Best Method Banner */}
            {lurePick.methods?.[0] && (
              <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-medium uppercase ${isDark ? 'text-amber-400/60' : 'text-amber-500'}`}>Best Method Today</div>
                    <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{lurePick.methods[0].label}</div>
                    <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{lurePick.methods[0].reason}</div>
                  </div>
                  <div className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {lurePick.methods[0].confidence}%
                  </div>
                </div>
              </div>
            )}

            {/* Bass Pattern Insight */}
            {lurePick.bassPattern && (
              <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                <div className={`text-xs font-medium uppercase mb-1 ${isDark ? 'text-green-400/60' : 'text-green-500'}`}>Bass Seasonal Pattern</div>
                <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{lurePick.bassPattern.desc}</div>
              </div>
            )}
            {lurePick.walleyePattern && (
              <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className={`text-xs font-medium uppercase mb-1 ${isDark ? 'text-yellow-400/60' : 'text-yellow-500'}`}>Walleye Pattern</div>
                <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{lurePick.walleyePattern.desc}</div>
              </div>
            )}

            {/* Method Tabs */}
            {lurePick.methods?.length > 1 && (
              <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                <button onClick={() => setActiveMethodTab('all')} className={`text-[10px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${activeMethodTab === 'all' ? (isDark ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'bg-amber-100 text-amber-800 border border-amber-300') : (isDark ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}>
                  All
                </button>
                {[...new Set(lurePick.methods.map(m => m.method))].slice(0, 5).map(method => (
                  <button key={method} onClick={() => setActiveMethodTab(method)} className={`text-[10px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors capitalize ${activeMethodTab === method ? (isDark ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'bg-amber-100 text-amber-800 border border-amber-300') : (isDark ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}>
                    {method === 'fly' ? 'Fly' : method === 'spin' ? 'Spin' : method === 'bait' ? 'Bait' : method === 'troll' ? 'Troll' : method === 'ice' ? 'Ice' : method === 'topwater' ? 'Topwater' : method}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Top Lure Pick */}
          <div className={`mx-4 mb-3 p-4 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <TackleThumb name={lurePick.topPick.lure.name} className="w-14 h-14" />
                <div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {lurePick.topPick.lure.name}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {lurePick.topPick.lure.size}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {lurePick.topPick.confidence}%
                </div>
                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>confidence</div>
              </div>
            </div>
            <div className={`text-xs mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              {lurePick.topPick.reason}
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <span className="font-medium">Method:</span> {lurePick.topPick.lure.method}
            </div>
            {lurePick.topPick.lure.colors && (
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-medium">Colors:</span> {lurePick.topPick.lure.colors.join(', ')}
              </div>
            )}
            {lurePick.topPick.lure.rig && (
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="font-medium">Rig:</span> {lurePick.topPick.lure.rig}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                {LURE_TIME_LABELS[lurePick.topPick.timeWindow] || lurePick.topPick.timeWindow}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${isDark ? 'bg-slate-600/40 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                {lurePick.topPick.lure.category}
              </span>
            </div>
          </div>

          {/* Alternatives */}
          {lurePick.alternatives.length > 0 && (
            <div className="px-4 pb-3">
              <div className={`text-[10px] font-medium uppercase mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Also try
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lurePick.alternatives
                  .filter(a => activeMethodTab === 'all' || LURES[a.lureKey]?.category === activeMethodTab || (activeMethodTab === 'spin' && ['soft-plastic', 'hard-bait', 'shore-cast'].includes(LURES[a.lureKey]?.category)) || (activeMethodTab === 'bait' && LURES[a.lureKey]?.category === 'bait') || (activeMethodTab === 'troll' && LURES[a.lureKey]?.category === 'trolling') || (activeMethodTab === 'topwater' && LURES[a.lureKey]?.category === 'topwater') || (activeMethodTab === 'ice' && LURES[a.lureKey]?.category === 'ice'))
                  .slice(0, 4)
                  .map((alt, i) => (
                  <div key={i} className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-start gap-2.5">
                      <TackleThumb name={alt.lure.name} className="w-10 h-10 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{alt.lure.name}</span>
                          <span className={`text-[10px] font-bold ${alt.confidence >= 80 ? (isDark ? 'text-amber-400' : 'text-amber-600') : alt.confidence >= 60 ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>{alt.confidence}%</span>
                        </div>
                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {alt.lure.size} {alt.lure.colors ? `• ${alt.lure.colors[0]}` : ''}
                        </div>
                        <div className={`text-[10px] mt-1 italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {alt.reason.length > 70 ? alt.reason.slice(0, 67) + '...' : alt.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Plan */}
          {lurePick.timePlan?.some(t => t.pick) && (
            <div className={`mx-4 mb-4 p-3 rounded-lg ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
              <div className={`text-[10px] font-medium uppercase mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Clock className="w-3 h-3" />
                Time-of-Day Plan
              </div>
              <div className="space-y-1.5">
                {lurePick.timePlan.filter(t => t.pick).map((tw, i) => (
                  <div key={i} className={`flex items-center gap-2 text-[11px] rounded-md px-2 py-1 ${tw.isCurrent ? (isDark ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-amber-50 border border-amber-200') : ''}`}>
                    {tw.isCurrent && <ChevronRight className="w-3 h-3 text-amber-400 shrink-0" />}
                    <span className={`font-medium w-32 shrink-0 ${tw.isCurrent ? (isDark ? 'text-amber-400' : 'text-amber-700') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                      {tw.label}
                    </span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}>{tw.pick.name}</span>
                    <span className={`text-[10px] ml-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{tw.pick.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color Recommendation */}
          {lurePick.colorRecommendation && (
            <div className={`mx-4 mb-4 p-3 rounded-lg flex items-start gap-2 ${isDark ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
              <Target className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <div>
                <div className={`text-[10px] font-medium uppercase mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Color Selection</div>
                <div className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  <span className="font-semibold">{lurePick.colorRecommendation.primary}</span>
                  <span className={`mx-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>or</span>
                  <span className="font-semibold">{lurePick.colorRecommendation.secondary}</span>
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lurePick.colorRecommendation.reason}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TODAY'S FLY PICK ═══════ */}
      {flyPick?.topPick && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gradient-to-br from-emerald-900/30 to-slate-800/50 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-sm'}`}>
          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <Bug className="w-4 h-4" />
                Today's Fly Pick
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <CloudSun className="w-3 h-3" />
                  {flyPick.skyLabel}
                </span>
                {/* Nymph vs Dry badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  flyPick.nymphVsDry.pick === 'dry' ? (isDark ? 'bg-amber-500/25 text-amber-400' : 'bg-amber-100 text-amber-700')
                  : flyPick.nymphVsDry.pick === 'nymph' ? (isDark ? 'bg-cyan-500/25 text-cyan-400' : 'bg-cyan-100 text-cyan-700')
                  : (isDark ? 'bg-purple-500/25 text-purple-400' : 'bg-purple-100 text-purple-700')
                }`}>
                  {flyPick.nymphVsDry.pick === 'dry-dropper' ? 'DRY-DROPPER' : flyPick.nymphVsDry.pick.toUpperCase()}
                </span>
              </div>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {flyPick.nymphVsDry.reason}
            </p>
          </div>

          {/* Top Pick */}
          <div className={`mx-4 mb-3 p-4 rounded-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3">
                <TackleThumb name={flyPick.topPick.name} className="w-14 h-14" />
                <div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {flyPick.topPick.name}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {flyPick.topPick.size}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {flyPick.topPick.confidence}%
                </div>
                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>confidence</div>
              </div>
            </div>
            <div className={`text-xs mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {flyPick.topPick.reason}
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <span className="font-medium">Patterns:</span> {flyPick.topPick.patterns.join(', ')}
            </div>
            <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="font-medium">Method:</span> {flyPick.topPick.method}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {TIME_WINDOW_LABELS[flyPick.topPick.timeWindow] || flyPick.topPick.timeWindow}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${isDark ? 'bg-slate-600/40 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                {flyPick.topPick.category}
              </span>
              {weatherHatchTriggers.some(t => t.flyKey === flyPick.topPick.flyKey) && (
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50' : 'bg-cyan-100 text-cyan-700 border border-cyan-300'}`}>
                  ⚡ LIVE WEATHER MATCH
                </span>
              )}
            </div>
          </div>

          {/* Alternatives */}
          {flyPick.alternatives.length > 0 && (
            <div className="px-4 pb-3">
              <div className={`text-[10px] font-medium uppercase mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Also try
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {flyPick.alternatives.map((alt, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <TackleThumb name={alt.name} className="w-10 h-10 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {alt.name}
                          </span>
                          <span className={`text-[10px] font-bold ${
                            alt.confidence >= 70 ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                            : alt.confidence >= 50 ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
                            : (isDark ? 'text-slate-400' : 'text-slate-500')
                          }`}>
                            {alt.confidence}%
                          </span>
                        </div>
                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {alt.size} • {alt.patterns[0]}
                        </div>
                        <div className={`text-[10px] mt-1 italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {alt.reason.length > 60 ? alt.reason.slice(0, 57) + '...' : alt.reason}
                        </div>
                        {weatherHatchTriggers.some(t => t.flyKey === alt.flyKey) && (
                          <span className={`inline-block mt-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/25 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                            ⚡ WEATHER MATCH
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time-of-Day Guide */}
          {flyPick.timeGuide.length > 1 && (
            <div className={`mx-4 mb-4 p-3 rounded-lg ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
              <div className={`text-[10px] font-medium uppercase mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Clock className="w-3 h-3" />
                Pattern schedule
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {flyPick.timeGuide.map((tw, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {tw.label}:
                    </span>
                    <span className={`text-[10px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {tw.fly} {tw.size}
                    </span>
                    {i < flyPick.timeGuide.length - 1 && (
                      <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro Teaser — Fly Intelligence */}
          {!isPro && (
            <div className="px-4 pb-4">
              <ProTeaser
                variant="fly"
                compact
                onUnlock={onUnlockPro}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════ TROLLING INTELLIGENCE ═══════ */}
      {lurePick?.trollingSetup && location.type !== 'river' && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-blue-500/30' : 'bg-blue-50/50 border-blue-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              <Ship className="w-4 h-4" />
              Trolling Intelligence — {lurePick.trollingSpecies}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target Depth</div>
              <div className={`text-2xl font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{lurePick.trollingSetup.depth[0]}-{lurePick.trollingSetup.depth[1]}</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>feet</div>
            </div>
            <div>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Troll Speed</div>
              <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{lurePick.trollingSetup.speed}</div>
            </div>
            <div>
              <div className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Setup</div>
              <div className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{lurePick.trollingSetup.rig}</div>
            </div>
          </div>
          <div className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{lurePick.trollingSetup.note}</div>
          {lurePick.trollingSetup.tempAdvice && (
            <div className={`text-xs mt-2 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lurePick.trollingSetup.tempAdvice}</div>
          )}
        </div>
      )}

      {/* ═══════ SHORE ANGLER GUIDE ═══════ */}
      {shoreAdvice && location.type !== 'river' && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-cyan-500/30' : 'bg-cyan-50/50 border-cyan-200 shadow-sm'}`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Anchor className="w-4 h-4" />
            Shore Angler Guide
          </h3>
          {shoreAdvice.bankRecommendation && (
            <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
              <div className={`text-xs font-medium uppercase mb-1 ${isDark ? 'text-cyan-400/60' : 'text-cyan-500'}`}>Best Bank</div>
              <div className={`text-sm font-semibold mb-1 capitalize ${isDark ? 'text-white' : 'text-slate-800'}`}>Fish the {shoreAdvice.bankRecommendation.direction} side</div>
              <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{shoreAdvice.bankRecommendation.reason}</div>
            </div>
          )}
          <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-slate-700/30' : 'bg-white border border-slate-200'}`}>
            <div className={`text-xs font-medium uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Recommended Rig</div>
            <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{shoreAdvice.recommendedRig}</div>
          </div>
          <div className="space-y-1.5">
            {shoreAdvice.tips.map((tip, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <CheckCircle className={`w-3 h-3 mt-0.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Factors Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Wind Speed & Direction */}
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wind className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Wind</span>
            {windData?.stations?.[0]?.speed != null && (
              <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">LIVE</span>
            )}
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {safeToFixed(windSpeed, 0)} <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mph</span>
          </div>
          {windDirection && (
            <div className="flex items-center gap-1.5 mt-1">
              <Navigation className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} style={{ transform: `rotate(${(typeof windDirection === 'number' ? windDirection : 0) + 180}deg)` }} />
              <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {typeof windDirection === 'number' ? degreesToCompass(windDirection) : windDirection}
              </span>
              {typeof windDirection === 'number' && (
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{windDirection}°</span>
              )}
            </div>
          )}
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {windSpeed < 5 ? 'Glass — ideal for dry flies' : windSpeed < 10 ? 'Light breeze — good fishing' : windSpeed < 15 ? 'Moderate — adjust presentations' : windSpeed < 20 ? 'Strong — switch to streamers' : 'Very windy — tough conditions'}
          </div>
        </div>

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
            {safeToFixed(pressure, 2)}
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
          {location.primarySpecies && FISH_SPECIES[location.primarySpecies] && (
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {location.primarySpecies} optimal: {FISH_SPECIES[location.primarySpecies]?.tempOptimal?.join('-')}°F
          </div>
          )}
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
      
      {/* What to Throw — Species Tactics for Current Season */}
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <Target className="w-4 h-4" />
          What to Throw — {season.charAt(0).toUpperCase() + season.slice(1)} Tactics
        </h3>
        <div className="space-y-3">
          {location.species.map(species => {
            const speciesData = FISH_SPECIES[species];
            const isPrimary = species === location.primarySpecies;
            const rawTactics = speciesData?.tactics?.[season];
            const artOnly = isArtificialOnly(selectedLocation);
            const tactics = rawTactics && artOnly ? {
              ...rawTactics,
              lures: rawTactics.lures?.replace(/\b(?:PowerBait|nightcrawler|worm\s*(?:tip)?|wax\s*worm|chicken\s*liver|stink\s*bait|cut\s*(?:bait|carp|shad)|corn|minnow|live\s*bait)[^,]*/gi, '').replace(/,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '') || null,
              tip: rawTactics.tip?.replace(/\b(?:PowerBait|nightcrawler|worm)[^.;]*/gi, '').trim() || rawTactics.tip,
            } : rawTactics;
            return (
              <div
                key={species}
                className={`p-3 rounded-lg border ${
                  isPrimary
                    ? (isDark ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200')
                    : (isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200')
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{speciesData?.icon || '🐟'}</span>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{species}</span>
                    {isPrimary && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>Primary</span>
                    )}
                  </div>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {speciesData?.tempOptimal?.join('-')}°F
                  </span>
                </div>
                {tactics ? (
                  <div className="space-y-1.5">
                    <div className={`text-xs font-semibold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>{tactics.method}</div>
                    {tactics.flies && tactics.flies !== 'N/A' && tactics.flies !== 'N/A — too deep' && tactics.flies !== 'N/A — too large' && tactics.flies !== 'N/A — ice fishing' && (
                      <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Flies:</span> {tactics.flies}
                      </div>
                    )}
                    {tactics.lures && tactics.lures !== 'N/A' && (
                      <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Lures:</span> {tactics.lures}
                      </div>
                    )}
                    <div className={`text-xs italic mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tactics.tip}</div>
                  </div>
                ) : (
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{artOnly ? 'General approach — try small spinners, spoons, or fly patterns' : 'General approach — try worms, PowerBait, or small spinners'}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Regulations & Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RegulationsCard locationId={selectedLocation} locationName={location.name} />
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200 shadow-sm'}`}>
          <div className={`text-xs font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
            <Zap className="w-3.5 h-3.5" /> Pro Tip
          </div>
          <div className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{location.tips}</div>
          {location.iceOff && (
            <div className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Calendar className="w-3 h-3 inline mr-1" /> Ice-off typically: {location.iceOff}
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
        locationId={selectedLocation}
        currentWind={{ speed: windSpeed }}
        pressureData={pressureData}
        activity="fishing"
        upstreamData={upstreamData}
      />
    </div>
  );
};

export default FishingMode;
