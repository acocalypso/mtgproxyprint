import { describe, expect, it } from 'vitest';
import { parseDecklist } from '../parser';

describe('parseDecklist', () => {
  it('parses lines with set and collector number', () => {
    const result = parseDecklist('3 Lightning Bolt (lea) 150\n');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      qty: 3,
      name: 'Lightning Bolt',
      set: 'lea',
      collector: '150',
      foil: false
    });
  });

  it('parses lines with set but no collector number', () => {
    const result = parseDecklist('1 Anthroplasm (ulg)');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      qty: 1,
      name: 'Anthroplasm',
      set: 'ulg'
    });
    expect(result[0].collector).toBeUndefined();
  });

  it('parses foil flag with suffix collector', () => {
    const result = parseDecklist('1 Sol Ring (c20) 1a *F*');
    expect(result[0]).toMatchObject({
      qty: 1,
      name: 'Sol Ring',
      set: 'c20',
      collector: '1a',
      foil: true
    });
  });

  it('falls back to name-only pattern', () => {
    const result = parseDecklist('4 Counterspell');
    expect(result[0].qty).toBe(4);
    expect(result[0].name).toBe('Counterspell');
    expect(result[0].set).toBeUndefined();
    expect(result[0].collector).toBeUndefined();
  });

  it('records parse errors for invalid lines while preserving order', () => {
    const input = ['2 Good Card (set) 123', 'bad line', '1 Another Card'].join('\n');
    const result = parseDecklist(input);

    expect(result).toHaveLength(3);
    expect(result[1].parseError).toBeDefined();
    expect(result[1].name).toBe('bad line');
  });

  it('strips Archidekt annotations while parsing set and collector', () => {
    const input = '1x Adarkar Valkyrie (c14) 63 [Maybeboard{noDeck}{noPrice},Recursion]';
    const result = parseDecklist(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      qty: 1,
      name: 'Adarkar Valkyrie',
      set: 'c14',
      collector: '63'
    });
  });

  it('ignores caret-delimited notes such as Archidekt proxy annotations', () => {
    const input = '1x Adarkar Wastes (m3c) 316 [Land] ^Proxy MPC,#0d97fa^';
    const result = parseDecklist(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      qty: 1,
      name: 'Adarkar Wastes',
      set: 'm3c',
      collector: '316'
    });
  });
});
