export function buildFullUrl(domain, path) {

    if (!path) return `https:

    return path.startsWith('http') ? path : `https:
}

export function extractHref(xml, tag) {

    const regex = new RegExp('<[^>]*?' + tag + '[^>]*?>[\\s\\S]*?<[^>]*?href[^>]*?>([^<]+)<\\/', 'i');

    const m = xml.match(regex);

    return m ? m[1].trim() : null;
}

export function parseIcsFromXml(xml) {
  const results = [];

  const prodidMatch = xml.match(/PRODID:(.*)\r?\n/);
  const globalProdid = prodidMatch ? prodidMatch[1].trim() : '';

  const vcalendarBlocks = xml.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) || [];

  for (const vcal of vcalendarBlocks) {

    const blockProdidMatch = vcal.match(/PRODID:(.*)\r?\n/);
    const prodid = blockProdidMatch ? blockProdidMatch[1].trim() : globalProdid;

    const events = vcal.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

    for (const block of events) {

        const getField = (f) => {

            const m = block.match(new RegExp('^' + f + '(?:;[^:]*)?:(.*)$', 'm'));
            return m ? m[1].trim() : null;
        };

        results.push({
          summary: getField('SUMMARY') || 'No Title', 
          dtstart: getField('DTSTART') || '',
          dtend: getField('DTEND') || '',
          location: getField('LOCATION') || '',
          uid: getField('UID') || '',
          prodid: prodid, 
          created: getField('CREATED') || getField('DTSTAMP') || '' 
        });
    }
  }
  return results;
}