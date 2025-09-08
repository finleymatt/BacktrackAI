// Working test to verify Jest setup
describe('Working Jest Test', () => {
  it('should pass basic math test', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle strings', () => {
    expect('hello world').toContain('world');
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('test');
  });

  it('should work with async operations', async () => {
    const result = await Promise.resolve('async test');
    expect(result).toBe('async test');
  });
});
