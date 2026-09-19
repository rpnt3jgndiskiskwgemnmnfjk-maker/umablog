const CACHE_NAME = 'umablog-v1';
const OFFLINE_URL = '/offline/';
const PRECACHE_URLS = [OFFLINE_URL, '/favicon.svg'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
		return;
	}

	// Pages: always try the network first so new daily briefs show up immediately;
	// fall back to a cached copy, then the offline page, if the network is unavailable.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL)),
		);
		return;
	}

	// Static assets: serve from cache when available, otherwise fetch and cache for next time.
	event.respondWith(
		caches.match(request).then(
			(cached) =>
				cached ||
				fetch(request).then((response) => {
					const copy = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
					return response;
				}),
		),
	);
});
