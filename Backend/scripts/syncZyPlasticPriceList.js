/**
 * Sync ZY PLASTIC price list into items + categories.
 * Run: node scripts/syncZyPlasticPriceList.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Category = require('../models/Category');

const USER_ID = '69d4c812de4d0d163d810ad0';

const CATEGORY_COLORS = {
  Bend: '#2563EB',
  '45 Bend': '#1D4ED8',
  'Slow Bend': '#3B82F6',
  'Pressure Bend': '#1E40AF',
  Tee: '#059669',
  'Pressure Tee': '#047857',
  'Swerve Tee': '#10B981',
  'Y Tee': '#14B8A6',
  '4 Way Tee': '#0D9488',
  'End Cap': '#7C3AED',
  'End Cap Light': '#8B5CF6',
  Coupling: '#D97706',
  Reducer: '#EA580C',
  Bushing: '#C2410C',
  'Forcet Bend': '#DB2777',
  'Forcet Socket': '#BE185D',
  'Forcet Tee': '#9D174D',
  'Straight Socket': '#A21CAF',
  'Valve Socket': '#0891B2',
  'Thread Plug': '#0284C7',
  'Vent Cap': '#0369A1',
  'Clean Out': '#4B5563',
  'Clean Out Short': '#6B7280',
  Union: '#78716C',
  Clip: '#57534E',
  'Floor Drain': '#44403C',
  'U-Trap': '#292524',
  'U-Trap with Cleanout': '#1C1917',
  'Expansion Joint': '#64748B',
  'Threaded Bushing': '#475569',
  'Tank Connector': '#334155',
  'Wire Pipe': '#0F766E',
  'PPR Bend': '#7C2D12',
  'PPR 45 Bend': '#92400E',
  'PPR Tee': '#B45309',
  'PPR Coupling': '#A16207',
  'PPR Reducer': '#CA8A04',
  'PPR Reducer Bend': '#EAB308',
  'PPR Reducer Tee': '#FACC15',
  'PPR Valve Socket': '#854D0E',
  'PPR Forcet Bend': '#713F12',
  'PPR Forcet Tee': '#57534E',
  'PPR Forcet Socket': '#44403C',
  'PPR Double Bend': '#78350F',
  'PPR StopCock': '#451A03',
  'PPR Crossover': '#365314',
  'Air Valve': '#0369A1',
  S100: '#15803D',
  'Flexible Tube': '#4338CA',
  'Shower Accessories': '#6D28D9',
  'PPR Tools': '#BE123C',
  'Thread Tape': '#0E7490',
  'Tee P': '#065F46',
  'Slow Bend Short': '#2563EB',
};

/** @type {{ specification: string, description: string, qty: number, unitPrice: number, sack: number, amount: number }[]} */
const PRICE_LIST = [
  // Page 1
  { specification: '20mm (1/2")', description: 'Bend', qty: 800, unitPrice: 0.57, sack: 1, amount: 456 },
  { specification: '25mm (3/4")', description: 'Bend', qty: 500, unitPrice: 0.82, sack: 1, amount: 410 },
  { specification: '32mm (1")', description: 'Bend', qty: 300, unitPrice: 1.4, sack: 1, amount: 420 },
  { specification: '40mm (1-1/4")', description: 'Bend', qty: 130, unitPrice: 2.4, sack: 1, amount: 312 },
  { specification: '50mm (1-1/2")', description: 'Bend', qty: 100, unitPrice: 3.3, sack: 1, amount: 330 },
  { specification: '63mm (2")', description: 'Bend', qty: 80, unitPrice: 4.7, sack: 1, amount: 376 },
  { specification: '63mm (2")', description: 'Bend L', qty: 80, unitPrice: 4.2, sack: 1, amount: 336 },
  { specification: '75mm (3")', description: 'Bend', qty: 60, unitPrice: 6.36, sack: 1, amount: 381.6 },
  { specification: '110mm (4")', description: 'Bend L', qty: 35, unitPrice: 9.21, sack: 1, amount: 322.4 },
  { specification: '110mm (4")', description: 'Bend', qty: 35, unitPrice: 10.01, sack: 1, amount: 350.4 },
  { specification: '160mm (6")', description: 'Bend', qty: 10, unitPrice: 40.04, sack: 1, amount: 400.4 },
  { specification: '63mm (2")', description: 'Bend P', qty: 60, unitPrice: 13.51, sack: 1, amount: 810.6 },
  { specification: '75mm (3")', description: 'Bend P', qty: 50, unitPrice: 32.03, sack: 1, amount: 1601.5 },
  { specification: '110mm (4")', description: 'Bend P', qty: 30, unitPrice: 48.05, sack: 1, amount: 1441.5 },
  { specification: '63mm (2")', description: 'Slow Bend', qty: 80, unitPrice: 3.15, sack: 1, amount: 252 },
  { specification: '75mm (3")', description: 'Slow Bend', qty: 50, unitPrice: 8.01, sack: 1, amount: 400.5 },
  { specification: '110mm (4")', description: 'Slow Bend', qty: 30, unitPrice: 14.11, sack: 1, amount: 423.3 },
  { specification: '110mm (4")', description: 'Slow Bend Short', qty: 30, unitPrice: 10.81, sack: 1, amount: 324.3 },
  { specification: '63mm (2")', description: '45° Bend', qty: 80, unitPrice: 3.85, sack: 1, amount: 308 },
  { specification: '75mm (3")', description: '45° Bend', qty: 40, unitPrice: 4.35, sack: 1, amount: 174 },
  { specification: '110mm (4")', description: '45° Bend L', qty: 50, unitPrice: 6.66, sack: 1, amount: 333 },
  { specification: '110mm (4")', description: '45° Bend', qty: 50, unitPrice: 7.26, sack: 1, amount: 363 },
  { specification: '160mm (6")', description: '45° Bend', qty: 15, unitPrice: 33.03, sack: 1, amount: 495.5 },
  { specification: '20mm (1/2")', description: 'Tee', qty: 500, unitPrice: 1.2, sack: 1, amount: 600 },
  { specification: '25mm (3/4")', description: 'Tee', qty: 300, unitPrice: 1.89, sack: 1, amount: 567 },
  { specification: '32mm (1")', description: 'Tee', qty: 200, unitPrice: 2.12, sack: 1, amount: 424 },
  { specification: '40mm (1-1/4")', description: 'Tee', qty: 100, unitPrice: 3.82, sack: 1, amount: 382 },
  { specification: '50mm (1-1/2")', description: 'Tee', qty: 60, unitPrice: 4.68, sack: 1, amount: 280.8 },
  { specification: '63mm (2")', description: 'Tee', qty: 50, unitPrice: 6.11, sack: 1, amount: 305.5 },
  { specification: '75mm (3")', description: 'Tee', qty: 40, unitPrice: 9.21, sack: 1, amount: 368.4 },
  { specification: '110mm (4")', description: 'Tee', qty: 20, unitPrice: 13.01, sack: 1, amount: 260.2 },
  { specification: '63mm (2")', description: 'Tee P', qty: 40, unitPrice: 15.02, sack: 1, amount: 600.8 },
  { specification: '75mm (3")', description: 'Tee P', qty: 35, unitPrice: 36.04, sack: 1, amount: 1261.4 },
  { specification: '110mm (4")', description: 'Tee P', qty: 20, unitPrice: 59.06, sack: 1, amount: 1181.2 },
  { specification: '63mm (2")', description: 'Swerve Tee', qty: 50, unitPrice: 4.48, sack: 1, amount: 224 },
  { specification: '75mm (3")', description: 'Swerve Tee', qty: 30, unitPrice: 12.41, sack: 1, amount: 372.3 },
  { specification: '110mm (4")', description: 'Swerve Tee', qty: 20, unitPrice: 16.52, sack: 1, amount: 330.4 },
  { specification: '160mm (6")', description: 'Swerve Tee', qty: 6, unitPrice: 60.06, sack: 1, amount: 360.4 },
  { specification: '63mm (2")', description: 'Y-Tee', qty: 40, unitPrice: 5.81, sack: 1, amount: 232.4 },
  { specification: '75mm (3")', description: 'Y-Tee', qty: 30, unitPrice: 12.81, sack: 1, amount: 384.3 },
  { specification: '110mm (4")', description: 'Y-Tee', qty: 15, unitPrice: 24.82, sack: 1, amount: 372.3 },
  { specification: '160mm (6")', description: 'Y-Tee', qty: 5, unitPrice: 74.07, sack: 1, amount: 370.4 },
  { specification: '110mm (4")', description: '4 Way Tee', qty: 15, unitPrice: 27.03, sack: 1, amount: 405.5 },
  { specification: '20mm (1/2")', description: 'Thread Plug', qty: 800, unitPrice: 0.45, sack: 1, amount: 360 },
  { specification: '25mm (3/4")', description: 'Thread Plug', qty: 600, unitPrice: 0.62, sack: 1, amount: 372 },
  { specification: '20mm (1/2")', description: 'Valve Socket', qty: 500, unitPrice: 0.45, sack: 1, amount: 225 },
  { specification: '25mm (3/4")', description: 'Valve Socket', qty: 300, unitPrice: 0.6, sack: 1, amount: 180 },
  { specification: '32mm (1")', description: 'Valve Socket', qty: 300, unitPrice: 1.2, sack: 1, amount: 360 },
  { specification: '63mm (2")', description: 'Valve Socket', qty: 130, unitPrice: 3.4, sack: 1, amount: 442 },
  { specification: '20mm (1/2")', description: 'End cap', qty: 500, unitPrice: 0.32, sack: 1, amount: 160 },
  // Page 2
  { specification: '25mm (3/4")', description: 'End cap', qty: 500, unitPrice: 0.44, sack: 1, amount: 220 },
  { specification: '32mm (1")', description: 'End cap', qty: 500, unitPrice: 0.7, sack: 1, amount: 350 },
  { specification: '40mm (1-1/4")', description: 'End cap', qty: 300, unitPrice: 1.16, sack: 1, amount: 348 },
  { specification: '50mm (1-1/2")', description: 'End cap', qty: 300, unitPrice: 1.52, sack: 1, amount: 456 },
  { specification: '63mm (2")', description: 'End cap', qty: 200, unitPrice: 1.9, sack: 1, amount: 380 },
  { specification: '75mm (3")', description: 'End cap', qty: 60, unitPrice: 5.86, sack: 1, amount: 351.6 },
  { specification: '110mm (4")', description: 'End cap', qty: 50, unitPrice: 7.01, sack: 1, amount: 350.5 },
  { specification: '63mm (2")', description: 'End cap L', qty: 80, unitPrice: 1.2, sack: 1, amount: 96 },
  { specification: '75mm (3")', description: 'End cap L', qty: 100, unitPrice: 2.9, sack: 1, amount: 290 },
  { specification: '110mm (4")', description: 'End cap L', qty: 100, unitPrice: 3.05, sack: 1, amount: 305 },
  { specification: '160mm (6")', description: 'End cap L', qty: 30, unitPrice: 14.91, sack: 1, amount: 447.3 },
  { specification: '20mm (1/2")', description: 'Coupling', qty: 400, unitPrice: 0.59, sack: 1, amount: 236 },
  { specification: '25mm (3/4")', description: 'Coupling', qty: 250, unitPrice: 0.75, sack: 1, amount: 187.5 },
  { specification: '32mm (1")', description: 'Coupling', qty: 150, unitPrice: 1.18, sack: 1, amount: 177 },
  { specification: '63mm (2")', description: 'Coupling', qty: 100, unitPrice: 2.8, sack: 1, amount: 280 },
  { specification: '75mm (3")', description: 'Coupling', qty: 30, unitPrice: 6.51, sack: 1, amount: 195.3 },
  { specification: '110mm (4")', description: 'Coupling', qty: 20, unitPrice: 10.71, sack: 1, amount: 214.2 },
  { specification: '160mm (6")', description: 'Coupling', qty: 18, unitPrice: 35.04, sack: 1, amount: 630.7 },
  { specification: '20mm (1/2")', description: 'Short Forcet Bend', qty: 250, unitPrice: 4.11, sack: 1, amount: 1028.5 },
  { specification: '20mm (1/2")', description: 'Long Forcet Bend', qty: 200, unitPrice: 4.13, sack: 1, amount: 825 },
  { specification: '25mm (3/4")', description: 'Forcet Bend', qty: 150, unitPrice: 6.05, sack: 1, amount: 907.5 },
  { specification: '20mm (1/2")', description: 'Forcet Socket', qty: 400, unitPrice: 3.41, sack: 1, amount: 1364 },
  { specification: '25mm (3/4")', description: 'Forcet Socket', qty: 250, unitPrice: 4.73, sack: 1, amount: 1182.5 },
  { specification: '32mm (1")', description: 'Straight Socket', qty: 300, unitPrice: 1.32, sack: 1, amount: 396 },
  { specification: '40mm (1-1/4")', description: 'Straight Socket', qty: 300, unitPrice: 2.51, sack: 1, amount: 753 },
  { specification: '50mm (1-1/2")', description: 'Straight Socket', qty: 200, unitPrice: 3.61, sack: 1, amount: 722 },
  { specification: '25mm (3/4") x 20mm (1/2")', description: 'Reducer', qty: 800, unitPrice: 0.66, sack: 1, amount: 528 },
  { specification: '25mm (3/4") x 32mm (1")', description: 'Reducer', qty: 600, unitPrice: 0.96, sack: 1, amount: 576 },
  { specification: '50mm (1-1/2") x 40mm (1-1/4")', description: 'Reducer', qty: 150, unitPrice: 2, sack: 1, amount: 300 },
  { specification: '63mm (2") x 32mm (1")', description: 'Reducer', qty: 100, unitPrice: 2.78, sack: 1, amount: 278 },
  { specification: '63mm (2") x 50mm (1-1/2")', description: 'Reducer', qty: 100, unitPrice: 3.1, sack: 1, amount: 310 },
  { specification: '63mm (2") x 75mm (3")', description: 'Reducer', qty: 50, unitPrice: 8.01, sack: 1, amount: 400.5 },
  { specification: '63mm (2") x 110mm (4")', description: 'Reducer', qty: 30, unitPrice: 13.01, sack: 1, amount: 390.3 },
  { specification: '75mm (3") x 110mm (4")', description: 'Reducer', qty: 24, unitPrice: 18.02, sack: 1, amount: 432.5 },
  { specification: '32mm (1") x 50mm (1-1/2")', description: 'Bushing', qty: 500, unitPrice: 1.69, sack: 1, amount: 845 },
  { specification: '63mm (2") x 50mm (1-1/2")', description: 'Bushing', qty: 300, unitPrice: 2.26, sack: 1, amount: 678 },
  { specification: '63mm (2") x 40mm (1-1/4")', description: 'Bushing', qty: 200, unitPrice: 2.88, sack: 1, amount: 576 },
  { specification: '63mm (2") x 75mm (3")', description: 'Bushing', qty: 80, unitPrice: 6.11, sack: 1, amount: 488.8 },
  { specification: '63mm (2") x 110mm (4")', description: 'Bushing', qty: 50, unitPrice: 8.31, sack: 1, amount: 415.5 },
  { specification: '110mm (4") x 75mm (3")', description: 'Bushing', qty: 50, unitPrice: 9.01, sack: 1, amount: 450.5 },
  { specification: '110mm (4") x 160mm (6")', description: 'Bushing', qty: 10, unitPrice: 32.03, sack: 1, amount: 320.3 },
  { specification: '63mm (2")', description: 'Vent Cap', qty: 150, unitPrice: 1.49, sack: 1, amount: 223.5 },
  { specification: '75mm (3")', description: 'Vent Cap', qty: 80, unitPrice: 3.25, sack: 1, amount: 260 },
  { specification: '110mm (4")', description: 'Vent Cap', qty: 60, unitPrice: 4.9, sack: 1, amount: 294 },
  { specification: '63mm (2")', description: 'Clean Out', qty: 150, unitPrice: 2.8, sack: 1, amount: 420 },
  { specification: '75mm (3")', description: 'Clean Out', qty: 50, unitPrice: 7.81, sack: 1, amount: 390.5 },
  { specification: '110mm (4")', description: 'Clean Out', qty: 40, unitPrice: 9.71, sack: 1, amount: 388.4 },
  { specification: '160mm (6")', description: 'Clean Out', qty: 8, unitPrice: 38.74, sack: 1, amount: 309.9 },
  { specification: '160mm (6")', description: 'Clean Out Short', qty: 8, unitPrice: 34.23, sack: 1, amount: 273.8 },
  { specification: '25mm (3/4")', description: 'Union', qty: 100, unitPrice: 3.7, sack: 1, amount: 370 },
  // Page 3
  { specification: '32mm (1")', description: 'Union', qty: 100, unitPrice: 6.71, sack: 1, amount: 671 },
  { specification: '20mm (1/2")', description: 'Clip', qty: 1000, unitPrice: 0.33, sack: 1, amount: 330 },
  { specification: '25mm (3/4")', description: 'Clip', qty: 700, unitPrice: 0.45, sack: 1, amount: 315 },
  { specification: '32mm (1")', description: 'Clip', qty: 450, unitPrice: 0.68, sack: 1, amount: 306 },
  { specification: '40mm (1-1/4")', description: 'Clip', qty: 350, unitPrice: 0.78, sack: 1, amount: 273 },
  { specification: '50mm (1-1/2")', description: 'Clip', qty: 300, unitPrice: 0.93, sack: 1, amount: 279 },
  { specification: '63mm (2")', description: 'Clip', qty: 300, unitPrice: 1.6, sack: 1, amount: 480 },
  { specification: '75mm (3")', description: 'Clip', qty: 250, unitPrice: 2.4, sack: 1, amount: 600 },
  { specification: '110mm (4")', description: 'Clip', qty: 150, unitPrice: 3.3, sack: 1, amount: 495 },
  { specification: '63mm (2")', description: 'Floor Drain', qty: 80, unitPrice: 6.61, sack: 1, amount: 528.8 },
  { specification: '110mm (4")', description: 'Floor Drain', qty: 30, unitPrice: 11.01, sack: 1, amount: 330.3 },
  { specification: '63mm (2")', description: 'U-Trap', qty: 60, unitPrice: 3.87, sack: 1, amount: 232.2 },
  { specification: '63mm (2")', description: 'U-Trap with Cleanout', qty: 50, unitPrice: 5.41, sack: 1, amount: 270.5 },
  { specification: '75mm (3")', description: 'Expansion Joint', qty: 30, unitPrice: 10.81, sack: 1, amount: 324.3 },
  { specification: '110mm (4")', description: 'Expansion Joint', qty: 10, unitPrice: 22.77, sack: 1, amount: 227.7 },
  { specification: '25mm (3/4") x 20mm (1/2")', description: 'Threaded Bushing', qty: 400, unitPrice: 0.45, sack: 1, amount: 180 },
  { specification: '25mm (3/4") x 32mm (1")', description: 'Threaded Bushing', qty: 300, unitPrice: 0.5, sack: 1, amount: 150 },
  { specification: '20mm (1/2")', description: 'Forcet Tee', qty: 150, unitPrice: 5.5, sack: 1, amount: 825.2 },
  { specification: '25mm (3/4")', description: 'Forcet Tee', qty: 100, unitPrice: 6.01, sack: 1, amount: 601 },
  { specification: '25mm (3/4")', description: 'Tank Connector', qty: 80, unitPrice: 6.31, sack: 1, amount: 504.8 },
  { specification: '32mm (1")', description: 'Tank Connector', qty: 50, unitPrice: 8.01, sack: 1, amount: 400.5 },
  { specification: '20mm (1/2")', description: 'Wire pipe(White)', qty: 25, unitPrice: 6.27, sack: 1, amount: 156.8 },
  { specification: '25mm (3/4")', description: 'Wire pipe(White)', qty: 20, unitPrice: 6.86, sack: 1, amount: 137.2 },
  { specification: 'PPR20mm (1/2")', description: 'Bend', qty: 200, unitPrice: 0.79, sack: 1, amount: 158 },
  { specification: 'PPR25mm (3/4")', description: 'Bend', qty: 100, unitPrice: 1.18, sack: 1, amount: 118 },
  { specification: 'PPR32mm (1")', description: 'Bend', qty: 100, unitPrice: 2.11, sack: 1, amount: 211 },
  { specification: 'PPR40mm (1-1/4")', description: 'Bend', qty: 50, unitPrice: 3.7, sack: 1, amount: 185 },
  { specification: 'PPR63mm (2")', description: 'Bend', qty: 15, unitPrice: 14.55, sack: 1, amount: 218.3 },
  { specification: 'PPR20mm (1/2")', description: '45° Bend', qty: 200, unitPrice: 0.85, sack: 1, amount: 170 },
  { specification: 'PPR25mm (3/4")', description: '45° Bend', qty: 100, unitPrice: 1.43, sack: 1, amount: 143 },
  { specification: 'PPR32mm (1")', description: '45° Bend', qty: 80, unitPrice: 2.08, sack: 1, amount: 166.4 },
  { specification: 'PPR20mm (1/2")', description: 'Tee', qty: 200, unitPrice: 1.06, sack: 1, amount: 212 },
  { specification: 'PPR25mm (3/4")', description: 'Tee', qty: 120, unitPrice: 1.51, sack: 1, amount: 181.2 },
  { specification: 'PPR25mm (3/4") x 1/2"', description: 'Tee', qty: 100, unitPrice: 1.62, sack: 1, amount: 162 },
  { specification: 'PPR32mm (1")', description: 'Tee', qty: 70, unitPrice: 2.7, sack: 1, amount: 189 },
  { specification: 'PPR25mm (3/4") x 1/2"', description: 'Reducer', qty: 200, unitPrice: 0.84, sack: 1, amount: 168 },
  { specification: 'PPR1" x 20mm (1/2")', description: 'Reducer', qty: 100, unitPrice: 1.18, sack: 1, amount: 118 },
  { specification: 'PPR1" x 25mm (3/4")', description: 'Reducer', qty: 100, unitPrice: 1.33, sack: 1, amount: 133 },
  { specification: 'PPR20mm (1/2")', description: 'Coupling', qty: 200, unitPrice: 0.62, sack: 1, amount: 124 },
  { specification: 'PPR25mm (3/4")', description: 'Coupling', qty: 200, unitPrice: 1, sack: 1, amount: 200 },
  { specification: 'PPR32mm (1")', description: 'Coupling', qty: 100, unitPrice: 1.43, sack: 1, amount: 143 },
  { specification: 'PPR63mm (2")', description: 'Coupling', qty: 25, unitPrice: 7.49, sack: 1, amount: 187.3 },
  { specification: 'PPR20mm (1/2")', description: 'Crossover', qty: 100, unitPrice: 1.48, sack: 1, amount: 148 },
  { specification: 'PPR32mm (1")', description: 'Crossover', qty: 50, unitPrice: 3.64, sack: 1, amount: 182 },
  { specification: 'PPR25mm (3/4") x 20mm (1/2")', description: 'Reducer Bend', qty: 100, unitPrice: 1.62, sack: 1, amount: 162 },
  { specification: 'PPR3/4" x 32mm (1")', description: 'Reducer Bend', qty: 100, unitPrice: 2.04, sack: 1, amount: 204 },
  { specification: 'PPR1" x 20mm (1/2")', description: 'Reducer Bend', qty: 100, unitPrice: 1.64, sack: 1, amount: 164 },
  { specification: 'PPR25mm (3/4") x 20mm (1/2")', description: 'Reducer Tee', qty: 100, unitPrice: 1.69, sack: 1, amount: 169 },
  { specification: 'PPR3/4" x 32mm (1")', description: 'Reducer Tee', qty: 80, unitPrice: 2.29, sack: 1, amount: 183.2 },
  { specification: 'PPR1" x 20mm (1/2")', description: 'Reducer Tee', qty: 80, unitPrice: 2.24, sack: 1, amount: 179.2 },
  // Page 4/5
  { specification: 'PPR20mm (1/2")', description: 'Valve Socket', qty: 100, unitPrice: 5.49, sack: 1, amount: 549 },
  { specification: 'PPR25mm (3/4")', description: 'Valve Socket', qty: 100, unitPrice: 8.21, sack: 1, amount: 821 },
  { specification: 'PPR32mm (1")', description: 'Valve Socket', qty: 50, unitPrice: 14.04, sack: 1, amount: 702 },
  { specification: 'PPR3/4" x 20mm (1/2")', description: 'Valve Socket', qty: 100, unitPrice: 6.45, sack: 1, amount: 645 },
  { specification: 'PPR1" x 20mm (1/2")', description: 'Valve Socket', qty: 100, unitPrice: 7.38, sack: 1, amount: 738 },
  { specification: 'PPR3/4" x 32mm (1")', description: 'Valve Socket', qty: 100, unitPrice: 8.94, sack: 1, amount: 894 },
  { specification: 'PPR20mm (1/2")', description: 'Forcet Bend', qty: 100, unitPrice: 5.2, sack: 1, amount: 520 },
  { specification: 'PPR20mm 20x(1/2")', description: 'Forcet Bend', qty: 100, unitPrice: 6.35, sack: 1, amount: 635 },
  { specification: 'PPR25mm (3/4")', description: 'Forcet Bend', qty: 80, unitPrice: 8.32, sack: 1, amount: 665.6 },
  { specification: '32mm (1")', description: 'Forcet Bend', qty: 50, unitPrice: 12.71, sack: 1, amount: 635.5 },
  { specification: 'PPR3/4" x 32mm (1")', description: 'Forcet Bend', qty: 50, unitPrice: 10.19, sack: 1, amount: 509.5 },
  { specification: 'PPR20mm (1/2")', description: 'Forcet Tee', qty: 100, unitPrice: 5.78, sack: 1, amount: 578 },
  { specification: 'PPR25mm (3/4")', description: 'Forcet Tee', qty: 50, unitPrice: 9.98, sack: 1, amount: 499 },
  { specification: 'PPR3/4" x 32mm (1")', description: 'Forcet Tee', qty: 50, unitPrice: 11.43, sack: 1, amount: 571.5 },
  { specification: 'PPR32mm (1")', description: 'Forcet Tee', qty: 40, unitPrice: 48.13, sack: 1, amount: 1925.2 },
  { specification: 'PPR1/2" x 20mm (1/2")', description: 'Double Bend', qty: 25, unitPrice: 15.59, sack: 1, amount: 389.8 },
  { specification: 'PPR32mm (1")', description: 'StopCock', qty: 100, unitPrice: 16.17, sack: 1, amount: 1617 },
  { specification: 'PPR20mm (1/2")', description: 'Forcet Socket', qty: 100, unitPrice: 4.74, sack: 1, amount: 474 },
  { specification: 'PPR25mm (3/4")', description: 'Forcet Socket', qty: 100, unitPrice: 5.78, sack: 1, amount: 578 },
  { specification: '20mm (1/2")', description: 'Air Valve', qty: 150, unitPrice: 4.62, sack: 1, amount: 693 },
  { specification: '25mm (3/4")', description: 'Air Valve', qty: 50, unitPrice: 7.26, sack: 1, amount: 363 },
  { specification: '32mm (1")', description: 'Air Valve', qty: 50, unitPrice: 11.22, sack: 1, amount: 561 },
  { specification: '40mm (1-1/4")', description: 'Air Valve', qty: 32, unitPrice: 17.38, sack: 1, amount: 556.2 },
  { specification: '50mm (1-1/2")', description: 'Air Valve', qty: 30, unitPrice: 27.94, sack: 1, amount: 838.2 },
  { specification: '63mm (2")', description: 'Air Valve', qty: 10, unitPrice: 45.87, sack: 1, amount: 458.7 },
  { specification: '500G Blue', description: 'S100 Glue', qty: 30, unitPrice: 20, sack: 1, amount: 600 },
  { specification: '500G Green', description: 'S100 Glue', qty: 30, unitPrice: 30, sack: 1, amount: 900 },
  { specification: '40cm', description: 'Black Flexible Tube -S', qty: 2, unitPrice: 6.6, sack: 1, amount: 13.2 },
  { specification: '40cm', description: '304 Flexible Tube -S', qty: 2, unitPrice: 9.24, sack: 1, amount: 18.5 },
  { specification: '40cm', description: 'Red&Blue Flexible Tube -S', qty: 1, unitPrice: 7.6, sack: 1, amount: 7.6 },
  { specification: '60cm', description: 'Black Flexible Tube -S', qty: 1, unitPrice: 9.24, sack: 1, amount: 9.2 },
  { specification: '60cm', description: 'Red&Blue Flexible Tube -S', qty: 1, unitPrice: 10.64, sack: 1, amount: 10.6 },
  { specification: '80cm', description: 'Black Flexible Tube -S', qty: 1, unitPrice: 10.56, sack: 1, amount: 10.6 },
  { specification: '80cm', description: 'Red&Blue Flexible Tube -S', qty: 1, unitPrice: 12.16, sack: 1, amount: 12.2 },
  { specification: '100cm', description: 'Black Flexible Tube -L', qty: 2, unitPrice: 11.88, sack: 1, amount: 23.8 },
  { specification: '100cm', description: '304 Flexible Tube -L', qty: 2, unitPrice: 17.16, sack: 1, amount: 34.3 },
  { specification: '/', description: 'Shower Arm', qty: 1, unitPrice: 7.9, sack: 1, amount: 7.9 },
  { specification: '150cm', description: 'Shower chain black', qty: 1, unitPrice: 13.2, sack: 1, amount: 13.2 },
  { specification: '150cm', description: 'Shower chain sliver', qty: 1, unitPrice: 10.56, sack: 1, amount: 10.6 },
  { specification: '42mm', description: 'PPRpipe cutter', qty: 1, unitPrice: 71.5, sack: 1, amount: 71.5 },
  { specification: '32mm', description: 'PPRpipe cutter', qty: 1, unitPrice: 39.6, sack: 1, amount: 39.6 },
  { specification: '/', description: 'PPR mashine Big', qty: 1, unitPrice: 181.5, sack: 1, amount: 181.5 },
  { specification: '/', description: 'PPR mashine small', qty: 1, unitPrice: 101.2, sack: 1, amount: 101.2 },
  { specification: '19mm*0.1mm*12m', description: 'Thread Tape(Yellow)', qty: 100, unitPrice: 3.96, sack: 1, amount: 396 },
  { specification: '12mm*0.1mm*12m', description: 'Thread Tape(Green)', qty: 100, unitPrice: 1.65, sack: 1, amount: 165 },
  { specification: '12mm*0.075mm*12m', description: 'Thread Tape(Blue)', qty: 100, unitPrice: 1.43, sack: 1, amount: 143 },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[""''″`]/g, '"')
    .replace(/[（(]/g, '(')
    .replace(/[）)]/g, ')')
    .replace(/½/g, '1/2')
    .replace(/¾/g, '3/4')
    .replace(/×/g, 'x')
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9"/().x&\-*+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function specTokens(spec) {
  const n = normalizeText(spec);
  const tokens = new Set();
  if (!n || n === '/') return tokens;
  tokens.add(n);
  const mm = n.match(/(\d+)\s*mm/g);
  if (mm) mm.forEach((m) => tokens.add(m.replace(/\s+/g, '')));
  const ppr = n.match(/ppr[^)]*\([^)]+\)/g);
  if (ppr) ppr.forEach((p) => tokens.add(p.replace(/\s+/g, '')));
  if (n.includes('1/2')) tokens.add('20mm');
  if (n.includes('3/4')) tokens.add('25mm');
  if (n.includes('1-1/4')) tokens.add('40mm');
  if (n.includes('1-1/2')) tokens.add('50mm');
  if (n.includes('(1")') || n.endsWith('1"')) tokens.add('32mm');
  if (n.includes('(2")')) tokens.add('63mm');
  if (n.includes('(3")')) tokens.add('75mm');
  if (n.includes('(4")')) tokens.add('110mm');
  if (n.includes('(6")')) tokens.add('160mm');
  return tokens;
}

function descTokens(desc) {
  const n = normalizeText(desc);
  const tokens = new Set([n]);
  n.split(/\s+/).forEach((t) => t && tokens.add(t));
  return tokens;
}

function resolveCategory(description, specification = '') {
  const d = description.trim();
  const specN = normalizeText(specification);
  const isPpr = specN.includes('ppr') || normalizeText(d).includes('ppr');

  if (isPpr) {
    if (d.includes('45')) return 'PPR 45 Bend';
    if (d === 'Bend') return 'PPR Bend';
    if (d === 'Tee') return 'PPR Tee';
    if (d === 'Coupling') return 'PPR Coupling';
    if (d === 'Reducer') return 'PPR Reducer';
    if (d === 'Reducer Bend') return 'PPR Reducer Bend';
    if (d === 'Reducer Tee') return 'PPR Reducer Tee';
    if (d === 'Valve Socket') return 'PPR Valve Socket';
    if (d === 'Forcet Bend') return 'PPR Forcet Bend';
    if (d === 'Forcet Tee') return 'PPR Forcet Tee';
    if (d === 'Forcet Socket') return 'PPR Forcet Socket';
    if (d === 'Double Bend') return 'PPR Double Bend';
    if (d === 'StopCock') return 'PPR StopCock';
    if (d === 'Crossover') return 'PPR Crossover';
    if (d.includes('pipe cutter') || d.includes('mashine')) return 'PPR Tools';
  }

  if (d === 'Bend P') return 'Pressure Bend';
  if (d === 'Tee P') return 'Pressure Tee';
  if (d === 'Bend L') return 'Bend';
  if (d === 'End cap L') return 'End Cap Light';
  if (d === 'End cap') return 'End Cap';
  if (d === '45° Bend' || d === '45° Bend L') return '45 Bend';
  if (d === 'Y-Tee') return 'Y Tee';
  if (d.includes('Wire pipe')) return 'Wire Pipe';
  if (d.includes('Flexible Tube')) return 'Flexible Tube';
  if (d.includes('Shower chain')) return 'Shower Accessories';
  if (d === 'Shower Arm') return 'Shower Accessories';
  if (d.includes('PPRpipe cutter') || d.includes('PPR mashine')) return 'PPR Tools';
  if (d.includes('Thread Tape')) return d.replace(/\s+/g, ' ').trim();
  if (d === 'S100 Glue') return 'S100';
  if (d === 'Short Forcet Bend' || d === 'Long Forcet Bend') return 'Forcet Bend';
  return d;
}

function buildItemName(specification, description) {
  const spec = specification.trim();
  const desc = description.trim();
  if (spec === '/' || spec === '') return desc;
  return `${spec} ${desc}`;
}

function buildDescription(row) {
  return [
    'PVC Plumbing Fittings',
    `Specification: ${row.specification}`,
    `Qty per sack: ${row.qty}`,
    `Unit Price: GHS ${row.unitPrice}`,
    `Sack: ${row.sack}`,
    `Price per sack: GHS ${row.amount}`,
  ].join(' | ');
}

function sackPrice(row) {
  return Math.round(Number(row.amount) * 100) / 100;
}

function isSyncedDescription(desc) {
  return String(desc || '').includes('Price per sack:');
}

function legacySpecAliases(spec) {
  const n = normalizeText(spec);
  const aliases = new Set([n]);
  if (n.includes("1/2")) aliases.add('20mm (1/2")');
  if (n.includes("3/4")) aliases.add('25mm (3/4")');
  if (n.includes('1-1/2') || n.includes('1 1/2')) aliases.add('50mm (1-1/2")');
  if (n.includes('1-1/4')) aliases.add('40mm (1-1/4")');
  return aliases;
}

function rowMatchScore(item, row) {
  const nameN = normalizeText(item.name);
  const catN = normalizeText(item.category);
  const specN = normalizeText(row.specification);
  const descN = normalizeText(row.description);
  const expectedCat = normalizeText(resolveCategory(row.description, row.specification));

  let score = 0;

  const rowSpecTokens = new Set([...specTokens(row.specification), ...legacySpecAliases(item.name)]);
  let specHits = 0;
  rowSpecTokens.forEach((t) => {
    if (t && (nameN.includes(t) || [...legacySpecAliases(row.specification)].some((a) => nameN.includes(normalizeText(a))))) {
      specHits += 1;
    }
  });
  if (specN === '/' || specN === '') {
    specHits = nameN.includes(descN) ? 2 : 0;
  }
  if (specHits === 0) return 0;

  const descWords = descN.split(' ').filter(Boolean);
  let descHits = 0;
  descWords.forEach((w) => {
    if (nameN.includes(w) || catN.includes(w)) descHits += 1;
  });
  if (descHits === 0) return 0;

  score += specHits * 3 + descHits * 2;
  if (catN === expectedCat || catN.includes(descN) || expectedCat.includes(catN)) score += 4;

  const rowIsPpr = specN.includes('ppr') || descN.includes('ppr');
  const itemIsPpr = nameN.includes('ppr') || catN.includes('ppr');
  if (rowIsPpr !== itemIsPpr) score -= 8;

  const priceDelta = Math.abs(Number(item.price) - row.amount);
  const unitPriceDelta = Math.abs(Number(item.price) - row.unitPrice);
  if (priceDelta < 0.5) score += 3;
  else if (unitPriceDelta < 0.05) score += 1;

  const expectedName = normalizeText(buildItemName(row.specification, row.description));
  if (nameN === expectedName) score += 10;

  // Legacy shorthand names e.g. 1/2'' Bend
  if (nameN.match(/^(1\/2|3\/4|1-1\/2)/) && specN.includes('20mm') === nameN.includes('1/2')) score += 2;

  return score;
}

async function cleanupLegacyDuplicates(userId, items) {
  const synced = items.filter((i) => isSyncedDescription(i.description));
  const legacy = items.filter((i) => !isSyncedDescription(i.description));
  let removed = 0;

  for (const oldItem of legacy) {
    const oldN = normalizeText(oldItem.name);
    const catN = normalizeText(oldItem.category);
    const duplicate = synced.find((s) => {
      const sN = normalizeText(s.name);
      const sCat = normalizeText(s.category);
      if (sN === oldN) return true;
      if (sCat !== catN && !(sCat.includes(catN) || catN.includes(sCat))) return false;
      const oldSpecs = legacySpecAliases(oldItem.name);
      return [...oldSpecs].some((a) => sN.includes(normalizeText(a))) || sN.includes(oldN) || oldN.includes(sN.split(' ')[0]);
    });
    if (duplicate) {
      await Item.deleteOne({ _id: oldItem._id });
      removed += 1;
    }
  }

  const refreshed = await Item.find({ user: userId });
  const byName = new Map();
  for (const item of refreshed) {
    const key = normalizeText(item.name);
    if (!byName.has(key)) {
      byName.set(key, item);
      continue;
    }
    const keep = byName.get(key);
    const keepSynced = isSyncedDescription(keep.description);
    const itemSynced = isSyncedDescription(item.description);
    let survivor = keep;
    let drop = item;
    if (!keepSynced && itemSynced) {
      survivor = item;
      drop = keep;
    } else if (keepSynced === itemSynced && String(item._id) < String(keep._id)) {
      survivor = item;
      drop = keep;
    }
    await Item.deleteOne({ _id: drop._id });
    byName.set(key, survivor);
    removed += 1;
  }

  return removed;
}

function findBestMatch(items, row, usedIds) {
  let best = null;
  let bestScore = 0;
  for (const item of items) {
    if (usedIds.has(String(item._id))) continue;
    const score = rowMatchScore(item, row);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 6 ? best : null;
}

async function ensureCategory(categoryMap, userId, categoryName) {
  const key = categoryName.trim();
  if (categoryMap.has(key)) return categoryMap.get(key);
  const color = CATEGORY_COLORS[key] || '#3B82F6';
  const created = await Category.create({
    user: userId,
    name: key,
    description: `${key} — PVC/PPR fittings`,
    color,
  });
  categoryMap.set(key, created);
  return created;
}

function nextSku(existingItems) {
  let max = 0;
  existingItems.forEach((item) => {
    const m = String(item.sku || '').match(/SKU-(\d+)/i);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `SKU-${String(max + 1).padStart(3, '0')}`;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const userId = new mongoose.Types.ObjectId(USER_ID);

  const items = await Item.find({ user: userId });
  const categories = await Category.find({ user: userId });
  const categoryMap = new Map(categories.map((c) => [c.name, c]));
  const usedIds = new Set();

  let updated = 0;
  let created = 0;
  const unmatched = [];

  for (let index = 0; index < PRICE_LIST.length; index++) {
    const row = PRICE_LIST[index];
    const categoryName = resolveCategory(row.description, row.specification);
    await ensureCategory(categoryMap, userId, categoryName);
    const categoryColor = CATEGORY_COLORS[categoryName] || '#3B82F6';

    const match = findBestMatch(items, row, usedIds);
    const payload = {
      name: buildItemName(row.specification, row.description),
      description: buildDescription(row),
      category: categoryName,
      categoryColor,
      price: sackPrice(row),
      cost: sackPrice(row),
      unit: 'sack',
      trackStock: true,
      quantityInStock: row.qty,
      reorderLevel: Math.max(1, Math.floor(row.qty * 0.1)),
      sortOrder: index + 1,
    };

    if (match) {
      usedIds.add(String(match._id));
      match.name = payload.name;
      match.description = payload.description;
      match.category = payload.category;
      match.categoryColor = payload.categoryColor;
      match.price = payload.price;
      match.cost = payload.cost;
      match.unit = payload.unit;
      match.trackStock = true;
      match.quantityInStock = payload.quantityInStock;
      match.reorderLevel = payload.reorderLevel;
      match.sortOrder = payload.sortOrder;
      await match.save();
      updated += 1;
    } else {
      const sku = nextSku(items);
      const item = await Item.create({
        user: userId,
        sku,
        ...payload,
      });
      items.push(item);
      created += 1;
    }
  }

  // Second pass: update any remaining legacy items
  const refreshed = await Item.find({ user: userId });
  for (let index = 0; index < PRICE_LIST.length; index++) {
    const row = PRICE_LIST[index];
    const categoryName = resolveCategory(row.description, row.specification);
    const categoryColor = CATEGORY_COLORS[categoryName] || '#3B82F6';
    const legacyMatch = refreshed.find((item) => {
      if (isSyncedDescription(item.description)) return false;
      return rowMatchScore(item, row) >= 6;
    });
    if (!legacyMatch) continue;
    legacyMatch.name = buildItemName(row.specification, row.description);
    legacyMatch.description = buildDescription(row);
    legacyMatch.category = categoryName;
    legacyMatch.categoryColor = categoryColor;
    legacyMatch.price = sackPrice(row);
    legacyMatch.cost = sackPrice(row);
    legacyMatch.unit = 'sack';
    legacyMatch.trackStock = true;
    legacyMatch.quantityInStock = row.qty;
    legacyMatch.reorderLevel = Math.max(1, Math.floor(row.qty * 0.1));
    legacyMatch.sortOrder = index + 1;
    await legacyMatch.save();
    updated += 1;
  }

  const afterUpdate = await Item.find({ user: userId });
  const removed = await cleanupLegacyDuplicates(userId, afterUpdate);

  // Refresh category item counts
  const allItems = await Item.find({ user: userId });
  for (const [name, cat] of categoryMap.entries()) {
    const count = allItems.filter((i) => i.category === name).length;
    if (cat.itemCount !== count) {
      cat.itemCount = count;
      await cat.save();
    }
  }

  console.log(JSON.stringify({ updated, created, removed, totalPriceList: PRICE_LIST.length, totalItems: allItems.length }, null, 2));

  const stillUnmatched = PRICE_LIST.filter((row) => {
    const cat = resolveCategory(row.description, row.specification);
    return !allItems.some((i) => normalizeText(i.name) === normalizeText(buildItemName(row.specification, row.description)));
  });
  if (stillUnmatched.length) {
    console.log('Rows without exact name match after sync:', stillUnmatched.length);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
