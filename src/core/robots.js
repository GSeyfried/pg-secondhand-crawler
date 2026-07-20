function patternRegex(pattern) {
  const anchored = pattern.endsWith('$');
  const raw = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}${anchored ? '$' : ''}`);
}

export function parseRobots(text) {
  const groups=[]; let agents=[]; let rules=[]; let readingAgents=false;
  const flush=()=>{if(agents.length)groups.push({agents:[...agents],rules:[...rules]});agents=[];rules=[];readingAgents=false;};
  for(const sourceLine of text.split(/\r?\n/)) {
    const line=sourceLine.replace(/\s*#.*$/,'').trim(); if(!line)continue;
    const colon=line.indexOf(':');if(colon<0)continue;
    const field=line.slice(0,colon).trim().toLowerCase(),value=line.slice(colon+1).trim();
    if(field==='user-agent') {
      if(!readingAgents && rules.length)flush();
      agents.push(value.toLowerCase());readingAgents=true;
    } else if((field==='allow'||field==='disallow')&&agents.length) {
      readingAgents=false;if(value)rules.push({allow:field==='allow',pattern:value});
    }
  }
  flush();return groups;
}

export function isRobotsAllowed(text,url,userAgent='pg-secondhand-crawler') {
  const name=userAgent.toLowerCase();const groups=parseRobots(text);
  const exact=groups.filter(g=>g.agents.some(a=>a!=='*'&&name.includes(a)));
  const applicable=exact.length?exact:groups.filter(g=>g.agents.includes('*'));
  const target=new URL(url);const path=`${target.pathname}${target.search}`;
  const matches=applicable.flatMap(g=>g.rules).filter(r=>patternRegex(r.pattern).test(path));
  if(!matches.length)return true;
  matches.sort((a,b)=>b.pattern.replace(/\*|\$$/g,'').length-a.pattern.replace(/\*|\$$/g,'').length || Number(b.allow)-Number(a.allow));
  return matches[0].allow;
}
