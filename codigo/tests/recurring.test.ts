import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isFinished,
  nextOccurrence,
  renderText,
  todayMadrid,
  upcomingDates,
} from '../shared/recurring.ts';

test('nextOccurrence mensual: fin de mes y vuelta al día original', () => {
  assert.equal(nextOccurrence('2026-01-31', 'monthly', 1, 31), '2026-02-28');
  // Sin ancla, el día se pierde; con ancla vuelve al 31 en marzo.
  assert.equal(nextOccurrence('2026-02-28', 'monthly', 1, 31), '2026-03-31');
  assert.equal(nextOccurrence('2026-03-31', 'monthly', 1, 31), '2026-04-30');
  assert.equal(nextOccurrence('2026-01-29', 'monthly', 1, 29), '2026-02-28');
  assert.equal(nextOccurrence('2026-01-30', 'monthly', 1, 30), '2026-02-28');
});

test('nextOccurrence: años bisiestos', () => {
  assert.equal(nextOccurrence('2028-01-31', 'monthly', 1, 31), '2028-02-29');
  assert.equal(nextOccurrence('2028-01-29', 'monthly', 1, 29), '2028-02-29');
  assert.equal(nextOccurrence('2027-01-29', 'monthly', 1, 29), '2027-02-28');
  assert.equal(nextOccurrence('2028-02-29', 'yearly', 1, 29), '2029-02-28');
  assert.equal(nextOccurrence('2027-02-28', 'yearly', 1, 29), '2028-02-29');
});

test('nextOccurrence: trimestral, anual e intervalos', () => {
  assert.equal(nextOccurrence('2026-11-30', 'quarterly'), '2027-02-28');
  assert.equal(nextOccurrence('2026-11-30', 'quarterly', 1, 30), '2027-02-28');
  assert.equal(nextOccurrence('2026-05-15', 'quarterly'), '2026-08-15');
  assert.equal(nextOccurrence('2026-10-01', 'quarterly'), '2027-01-01');
  assert.equal(nextOccurrence('2026-05-15', 'yearly'), '2027-05-15');
  assert.equal(nextOccurrence('2026-05-15', 'monthly', 2), '2026-07-15');
  assert.equal(nextOccurrence('2026-12-15', 'monthly'), '2027-01-15');
});

test('upcomingDates respeta el día de inicio, el fin y el máximo', () => {
  assert.deepEqual(upcomingDates('2026-01-31', 4, 'monthly', 1), [
    '2026-01-31',
    '2026-02-28',
    '2026-03-31',
    '2026-04-30',
  ]);
  assert.deepEqual(upcomingDates('2026-01-15', 5, 'monthly', 1, { endDate: '2026-03-20' }), [
    '2026-01-15',
    '2026-02-15',
    '2026-03-15',
  ]);
  assert.deepEqual(upcomingDates('2026-04-15', 5, 'monthly', 1, { maxOccurrences: 3, done: 1 }), [
    '2026-04-15',
    '2026-05-15',
  ]);
  assert.deepEqual(
    upcomingDates('2026-04-15', 3, 'yearly', 1, { anchorDay: 15, done: 5, maxOccurrences: 5 }),
    [],
  );
});

test('isFinished', () => {
  assert.equal(isFinished('2026-05-01', 2, null, null), false);
  assert.equal(isFinished('2026-05-01', 3, null, 3), true);
  assert.equal(isFinished('2026-05-01', 1, '2026-04-30', null), true);
  assert.equal(isFinished('2026-04-30', 1, '2026-04-30', null), false);
});

test('renderText sustituye variables y deja las desconocidas', () => {
  assert.equal(
    renderText('Factura {numero} de {cliente}. {otra}', { numero: 'F-1', cliente: 'Ana' }),
    'Factura F-1 de Ana. {otra}',
  );
});

test('todayMadrid usa el calendario de Madrid', () => {
  assert.equal(todayMadrid(new Date('2026-06-30T22:30:00Z')), '2026-07-01');
  assert.equal(todayMadrid(new Date('2026-12-31T22:30:00Z')), '2026-12-31');
});
