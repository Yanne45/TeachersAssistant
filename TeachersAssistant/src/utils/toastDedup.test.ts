import { describe, it, expect, beforeEach } from 'vitest';
import { addToastDedup, _resetCounter } from './toastDedup';
import type { ToastEntry } from './toastDedup';

describe('addToastDedup', () => {
  beforeEach(() => _resetCounter());

  it('ajoute un toast à une liste vide', () => {
    const { list, added } = addToastDedup([], 'success', 'OK');
    expect(list).toHaveLength(1);
    expect(added).not.toBeNull();
    expect(added!.type).toBe('success');
    expect(added!.message).toBe('OK');
  });

  it('refuse un doublon exact (même type + message)', () => {
    const existing: ToastEntry[] = [{ id: 'toast-1', type: 'success', message: 'OK' }];
    const { list, added } = addToastDedup(existing, 'success', 'OK');
    expect(list).toBe(existing); // même référence
    expect(added).toBeNull();
  });

  it('accepte un message différent avec le même type', () => {
    const existing: ToastEntry[] = [{ id: 'toast-1', type: 'success', message: 'Profil enregistré' }];
    const { list, added } = addToastDedup(existing, 'success', 'Appréciation modifiée');
    expect(list).toHaveLength(2);
    expect(added).not.toBeNull();
  });

  it('accepte le même message avec un type différent', () => {
    const existing: ToastEntry[] = [{ id: 'toast-1', type: 'success', message: 'OK' }];
    const { list, added } = addToastDedup(existing, 'error', 'OK');
    expect(list).toHaveLength(2);
    expect(added).not.toBeNull();
  });

  it('refuse les doublons successifs', () => {
    let list: ToastEntry[] = [];
    const r1 = addToastDedup(list, 'error', 'Échec');
    list = r1.list;
    expect(list).toHaveLength(1);

    const r2 = addToastDedup(list, 'error', 'Échec');
    expect(r2.list).toBe(list);
    expect(r2.added).toBeNull();

    const r3 = addToastDedup(list, 'error', 'Autre erreur');
    list = r3.list;
    expect(list).toHaveLength(2);
  });

  it('génère des IDs uniques', () => {
    const r1 = addToastDedup([], 'success', 'A');
    const r2 = addToastDedup(r1.list, 'success', 'B');
    expect(r1.added!.id).not.toBe(r2.added!.id);
  });
});
