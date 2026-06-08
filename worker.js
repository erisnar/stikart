// Cloudflare Worker for Stikart race submissions
// Deploy: wrangler deploy
// Set secret: wrangler secret put GITHUB_TOKEN
//
// env.GITHUB_TOKEN  — fine-grained PAT: Contents (write) + Pull requests (write)
// env.ALLOWED_ORIGINS — optional comma-separated list, defaults to stikart.no + localhost

const GITHUB_OWNER = 'erisnar';
const GITHUB_REPO = 'stikart';

const darkColorPool = [
    '#e63946', '#d62828', '#9b2335', '#c1121f', '#ff006e',
    '#f72585', '#b5179e', '#e91e63', '#c2185b', '#ad1457',
    '#e76f51', '#f4a261', '#fb5607', '#ff5400', '#e65100',
    '#ff6d00', '#f57c00', '#ef6c00', '#d84315', '#bf360c',
    '#8338ec', '#7209b7', '#6a1b9a', '#4a148c', '#311b92',
    '#5e35b1', '#512da8', '#4527a0', '#7c4dff', '#651fff',
    '#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#0277bd',
    '#01579b', '#023e8a', '#0353a4', '#3a86ff', '#4361ee',
    '#1b5e20', '#2e7d32', '#388e3c', '#087f5b', '#0b7285',
    '#5d4037', '#4e342e', '#6d4c41', '#795548', '#8d6e63'
];

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function toBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
}

function fromBase64(b64) {
    const binary = atob(b64.replace(/\n/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
}

function buildRaceEntryJs(raceData, gpxPath) {
    const fields = [
        `        name: ${JSON.stringify(raceData.name)}`,
        `        files: [${JSON.stringify(gpxPath)}]`,
        `        color: ${JSON.stringify(raceData.color)}`,
    ];
    if (raceData.url) fields.push(`        url: ${JSON.stringify(raceData.url)}`);
    if (raceData.description) fields.push(`        description: ${JSON.stringify(raceData.description)}`);
    fields.push(`        useCalculatedStats: true`);
    if (raceData.manualDistance) fields.push(`        manualDistance: ${raceData.manualDistance}`);
    fields.push(`        category: ${JSON.stringify(raceData.category)}`);
    if (raceData.date) fields.push(`        date: ${JSON.stringify(raceData.date)}`);
    return `    {\n${fields.join(',\n')}\n    }`;
}

function buildPRBody(raceData) {
    const catLabels = {
        'marathon-trail': '< 50K', '50k': '50K', '50-miles': '50 Miles',
        '100k': '100K', '100-miles': '100 Miles', '100-miles-plus': '100 Miles+'
    };
    return [
        `## Nytt løp: ${raceData.name}`,
        '',
        '| Felt | Verdi |',
        '|---|---|',
        `| Kategori | ${catLabels[raceData.category] || raceData.category} |`,
        raceData.date        ? `| Dato | ${raceData.date} |`               : '',
        raceData.url         ? `| Nettside | ${raceData.url} |`            : '',
        raceData.description ? `| Beskrivelse | ${raceData.description} |` : '',
        '',
        '_Sendt inn via stikart.no_'
    ].filter(Boolean).join('\n');
}

async function createRacePR(raceData, gpxContent, gpxFilename, token) {
    const slug = slugify(raceData.name);
    const gpxFileSlug = slugify(gpxFilename.replace(/\.gpx$/i, '')) + '.gpx';
    const gpxPath = `race-calendar/${slug}/${gpxFileSlug}`;
    const branch = `add-race/${slug}-${Date.now().toString(36)}`;
    const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'stikart-worker/1.0'
    };

    async function gh(path, options = {}) {
        const res = await fetch(apiBase + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `GitHub API ${res.status}`);
        }
        return res.json();
    }

    const mainRef = await gh('/git/ref/heads/main');
    const mainSha = mainRef.object.sha;

    await gh('/git/refs', {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainSha })
    });

    await gh(`/contents/${gpxPath}`, {
        method: 'PUT',
        body: JSON.stringify({
            message: `Add GPX for ${raceData.name}`,
            content: toBase64(gpxContent),
            branch
        })
    });

    const appJsFile = await gh(`/contents/app.js?ref=${encodeURIComponent(branch)}`);
    const appJsContent = fromBase64(appJsFile.content);
    const marker = 'const raceRoutes = [';
    const markerIdx = appJsContent.indexOf(marker);
    if (markerIdx === -1) throw new Error('raceRoutes not found in app.js');
    const insertAt = markerIdx + marker.length;
    const newAppJs = appJsContent.slice(0, insertAt) + '\n' + buildRaceEntryJs(raceData, gpxPath) + ',' + appJsContent.slice(insertAt);

    await gh('/contents/app.js', {
        method: 'PUT',
        body: JSON.stringify({
            message: `Add race: ${raceData.name}`,
            content: toBase64(newAppJs),
            sha: appJsFile.sha,
            branch
        })
    });

    return gh('/pulls', {
        method: 'POST',
        body: JSON.stringify({
            title: `Add race: ${raceData.name}`,
            body: buildPRBody(raceData),
            head: branch,
            base: 'main'
        })
    });
}

export default {
    async fetch(request, env) {
        const allowedOrigins = (env.ALLOWED_ORIGINS || 'https://stikart.no,http://localhost:8000')
            .split(',').map(s => s.trim());
        const origin = request.headers.get('Origin') || '';
        const corsHeaders = {
            'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (!allowedOrigins.includes(origin)) {
            return new Response('Forbidden', { status: 403, headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        if (!env.GITHUB_TOKEN) {
            return new Response(JSON.stringify({ error: 'Worker ikke konfigurert (mangler GITHUB_TOKEN)' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            const { name, url, date, description, category, manualDistance, gpxContent, gpxFilename } = await request.json();

            if (!name || !gpxContent || !gpxFilename || !category) {
                return new Response(JSON.stringify({ error: 'Mangler påkrevde felt' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const raceData = {
                name,
                url: url || '',
                date: date || '',
                description: description || '',
                category,
                manualDistance: manualDistance || undefined,
                color: darkColorPool[Math.floor(Math.random() * darkColorPool.length)]
            };

            const pr = await createRacePR(raceData, gpxContent, gpxFilename, env.GITHUB_TOKEN);

            return new Response(JSON.stringify({ prNumber: pr.number, prUrl: pr.html_url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
