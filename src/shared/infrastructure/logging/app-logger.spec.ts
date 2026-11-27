import { createAppLogger, logLevelsUpTo } from './app-logger';

describe('logLevelsUpTo', () => {
  it('includes the named level and the more important ones', () => {
    expect(logLevelsUpTo('error')).toEqual(['fatal', 'error']);
    expect(logLevelsUpTo('log')).toEqual(['fatal', 'error', 'warn', 'log']);
    expect(logLevelsUpTo('verbose')).toEqual([
      'fatal',
      'error',
      'warn',
      'log',
      'debug',
      'verbose',
    ]);
  });
});

describe('createAppLogger', () => {
  let written: string[];

  beforeEach(() => {
    written = [];
    const capture = (chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    };
    jest.spyOn(process.stdout, 'write').mockImplementation(capture);
    jest.spyOn(process.stderr, 'write').mockImplementation(capture);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes one JSON object per line, keeping structured messages', () => {
    const logger = createAppLogger('json', 'log');

    logger.log({ requestId: 'r1', status: 200 }, 'HTTP');

    expect(written).toHaveLength(1);
    expect(written[0].endsWith('\n')).toBe(true);
    expect(JSON.parse(written[0])).toMatchObject({
      level: 'log',
      context: 'HTTP',
      message: { requestId: 'r1', status: 200 },
    });
  });

  it('writes readable text in the pretty format', () => {
    const logger = createAppLogger('pretty', 'log');

    logger.log('API running', 'Bootstrap');

    expect(written.join('')).toContain('API running');
    expect(() => {
      JSON.parse(written[0]);
    }).toThrow();
  });

  it('leaves out the levels below the configured one', () => {
    const logger = createAppLogger('json', 'warn');

    logger.log('ignored');
    logger.debug('ignored');
    logger.warn('kept');

    expect(written).toHaveLength(1);
    expect(written[0]).toContain('kept');
  });
});
