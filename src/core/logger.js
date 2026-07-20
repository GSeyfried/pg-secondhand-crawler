export function createLogger(verbose=false) {
  const emit = (level, message, context={}) => {
    if (level === 'debug' && !verbose) return;
    console[level === 'debug' ? 'log' : level](JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }));
  };
  return Object.fromEntries(['debug','info','warn','error'].map(level => [level, (message, context) => emit(level, message, context)]));
}
