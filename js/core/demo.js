/* ================================================
   FLUX — DEMO ACCOUNT MODULE
   Creates fully-populated demo accounts so reviewers
   can explore the product without signing up.
   Requires: storage.js, api.js
   ================================================ */

var FluxDemo = (function () {
    'use strict';

    var DEMO = {
        client: {
            firstName: 'Sarah',
            lastName: 'Chen',
            email: 'sarah@techco.demo',
            password: 'demo1234',
            role: 'client',
            org: 'TechCo',
            jobTitle: 'Product Manager',
            teamName: 'Product'
        },
        agency: {
            firstName: 'Marcus',
            lastName: 'Reid',
            email: 'marcus@northstar.demo',
            password: 'demo1234',
            role: 'agency',
            org: 'Northstar Studio',
            jobTitle: 'Account Director',
            teamName: 'Delivery'
        }
    };

    var HOUR = 3600000;
    var DAY = 86400000;

    function _uid(prefix) {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Ensure the demo user exists in the users store.
     * Returns the user record.
     */
    function _ensureUser(role) {
        var spec = DEMO[role];
        var users = FluxStorage.get('users', []);

        for (var i = 0; i < users.length; i++) {
            if ((users[i].email || '').toLowerCase() === spec.email) {
                return users[i];
            }
        }

        var user = {
            id: _uid('user'),
            firstName: spec.firstName,
            lastName: spec.lastName,
            email: spec.email,
            password: spec.password,
            role: spec.role,
            org: spec.org,
            teamName: spec.teamName,
            jobTitle: spec.jobTitle,
            avatar: null,
            isDemo: true,
            notificationPrefs: {
                email: true, inApp: true, replies: true,
                statusChanges: true, digest: false
            },
            createdAt: Date.now() - 30 * DAY
        };

        users.push(user);
        FluxStorage.set('users', users);
        return user;
    }

    /**
     * Build a realistic multi-project dataset.
     * Only seeds once per demo user.
     */
    function _seed(user) {
        if (FluxStorage.get('demo_seeded_' + user.id, false)) return;

        var now = Date.now();

        /* ---------- Projects ---------- */
        var projects = FluxStorage.get('projects', []);
        var pRedesign = 'proj_demo_redesign';
        var pMobile = 'proj_demo_mobile';
        var pCampaign = 'proj_demo_campaign';

        var demoProjects = [
            {
                id: pRedesign,
                name: 'Website Redesign',
                client: 'TechCo',
                description: 'Full marketing site refresh — new brand system, CMS migration, and performance work.',
                color: '1',
                createdAt: now - 21 * DAY,
                updatedAt: now - 2 * HOUR
            },
            {
                id: pMobile,
                name: 'Mobile App v2',
                client: 'TechCo',
                description: 'iOS and Android companion app: onboarding, dashboard, and push notifications.',
                color: '3',
                createdAt: now - 14 * DAY,
                updatedAt: now - DAY
            },
            {
                id: pCampaign,
                name: 'Q3 Launch Campaign',
                client: 'TechCo',
                description: 'Landing pages, ad creative, and email sequence for the autumn product launch.',
                color: '4',
                createdAt: now - 7 * DAY,
                updatedAt: now - 3 * HOUR
            }
        ];

        demoProjects.forEach(function (dp) {
            var exists = projects.some(function (p) { return p.id === dp.id; });
            if (!exists) projects.push(dp);
        });

        FluxStorage.set('projects', projects);
        FluxStorage.set('active_project', pRedesign);

        /* ---------- Feedback ---------- */
        var store = FluxStorage.get('feedback_data', { feedback: [], nextId: 1 });
        if (!Array.isArray(store.feedback)) store.feedback = [];
        if (typeof store.nextId !== 'number') store.nextId = 1;

        // Don't double-seed feedback
        var alreadySeeded = store.feedback.some(function (f) { return f.isDemo; });

        if (!alreadySeeded) {
            var specs = [
                {
                    p: pRedesign, t: 'Hero headline is hard to read on mobile',
                    d: 'On iPhone the hero headline overlaps the background image and the contrast drops below AA. Can we add a scrim or shift the text block down?',
                    type: 'design', status: 'new', prio: 'high', age: 2 * HOUR,
                    comments: [
                        ['Sarah Chen', 'client', 'Screenshot attached from iPhone 14 Pro.', 1.5 * HOUR]
                    ],
                    files: [{ name: 'hero-mobile.png', size: '412 KB', type: 'png' }]
                },
                {
                    p: pRedesign, t: 'Pricing table columns misaligned in Safari',
                    d: 'The third pricing column sits about 8px lower than the others in Safari 17. Chrome and Firefox render correctly.',
                    type: 'bug', status: 'review', prio: 'urgent', age: 6 * HOUR,
                    comments: [
                        ['Marcus Reid', 'agency', 'Reproduced — it is a flexbox baseline issue. Fix is in progress.', 4 * HOUR],
                        ['Sarah Chen', 'client', 'Thanks for the quick turnaround!', 3 * HOUR]
                    ]
                },
                {
                    p: pRedesign, t: 'Update the About page copy',
                    d: 'The team bios are out of date — three people have left and we have two new hires. New copy is in the shared doc.',
                    type: 'copy', status: 'awaiting', prio: 'normal', age: DAY,
                    comments: [
                        ['Marcus Reid', 'agency', 'Draft is live on staging. Can you review and approve?', 5 * HOUR]
                    ]
                },
                {
                    p: pRedesign, t: 'Add favicon and social share images',
                    d: 'Open Graph tags are present but the image 404s. Also missing an apple-touch-icon.',
                    type: 'technical', status: 'approved', prio: 'normal', age: 3 * DAY,
                    comments: [
                        ['Marcus Reid', 'agency', 'Deployed and verified with the sharing debugger.', 2 * DAY]
                    ]
                },
                {
                    p: pRedesign, t: 'Contact form does not show validation errors',
                    d: 'Submitting an empty form silently fails. Users get no feedback at all.',
                    type: 'bug', status: 'approved', prio: 'high', age: 5 * DAY,
                    comments: []
                },
                {
                    p: pMobile, t: 'Onboarding flow needs a progress indicator',
                    d: 'Five screens with no sense of progress. A simple step counter or dots would reduce drop-off.',
                    type: 'design', status: 'new', prio: 'normal', age: 8 * HOUR,
                    comments: []
                },
                {
                    p: pMobile, t: 'Push notification copy is too long',
                    d: 'Android truncates at around 65 characters. Several of our strings run to 90+.',
                    type: 'copy', status: 'review', prio: 'low', age: 2 * DAY,
                    comments: [
                        ['Marcus Reid', 'agency', 'Rewriting all 12 strings to fit under 60 chars.', DAY]
                    ]
                },
                {
                    p: pMobile, t: 'Dashboard chart crashes on empty data',
                    d: 'If a user has no activity yet the chart component throws and the whole screen goes blank.',
                    type: 'bug', status: 'awaiting', prio: 'urgent', age: 10 * HOUR,
                    comments: [
                        ['Marcus Reid', 'agency', 'Empty state added — please confirm on TestFlight build 214.', 4 * HOUR]
                    ]
                },
                {
                    p: pCampaign, t: 'Landing page CTA button colour',
                    d: 'The green CTA clashes with the new brand palette. Can we try the primary indigo instead?',
                    type: 'design', status: 'new', prio: 'low', age: 3 * HOUR,
                    comments: []
                },
                {
                    p: pCampaign, t: 'Email sequence: fix broken unsubscribe link',
                    d: 'The unsubscribe link in email 3 points to a 404. This is a compliance issue.',
                    type: 'technical', status: 'review', prio: 'urgent', age: 5 * HOUR,
                    comments: [
                        ['Sarah Chen', 'client', 'Flagging this as urgent — legal have asked about it.', 4 * HOUR]
                    ]
                },
                {
                    p: pCampaign, t: 'Ad creative sizes for LinkedIn',
                    d: 'We have 1200x628 but LinkedIn also needs 1080x1080 and 628x1200 variants.',
                    type: 'design', status: 'approved', prio: 'normal', age: 4 * DAY,
                    comments: []
                }
            ];

            specs.forEach(function (s) {
                var ts = now - s.age;
                var history = [{ from: null, to: 'new', timestamp: ts, by: 'Sarah Chen' }];

                // Build a plausible status history
                var chain = ['new', 'review', 'awaiting', 'approved'];
                var target = chain.indexOf(s.status);
                for (var i = 1; i <= target; i++) {
                    history.push({
                        from: chain[i - 1],
                        to: chain[i],
                        timestamp: ts + (i * (s.age / (target + 1))),
                        by: 'Marcus Reid'
                    });
                }

                store.feedback.push({
                    id: store.nextId++,
                    isDemo: true,
                    title: s.t,
                    description: s.d,
                    type: s.type,
                    status: s.status,
                    client: 'TechCo',
                    projectId: s.p,
                    timestamp: ts,
                    files: s.files || [],
                    priority: s.prio,
                    comments: (s.comments || []).map(function (c, i) {
                        return {
                            id: ts + i + 1,
                            author: c[0],
                            role: c[1],
                            text: c[2],
                            timestamp: now - c[3]
                        };
                    }),
                    history: history
                });
            });

            // Newest first
            store.feedback.sort(function (a, b) { return b.timestamp - a.timestamp; });
            FluxStorage.set('feedback_data', store);
        }

        /* ---------- Notifications ---------- */
        var notifs = FluxStorage.get('notifications', []);
        if (!notifs.some(function (n) { return n.isDemo; })) {
            [
                ['Pricing table bug moved to In Review', 'info', 'fa-arrow-right', 3 * HOUR],
                ['New comment on "Hero headline is hard to read on mobile"', 'info', 'fa-comment-dots', 1.5 * HOUR],
                ['"Add favicon and social share images" was approved', 'success', 'fa-check-circle', 2 * DAY],
                ['Welcome to the Flux demo — explore freely, nothing is saved to a server.', 'success', 'fa-rocket', 0]
            ].forEach(function (n, i) {
                notifs.push({
                    id: now - i,
                    isDemo: true,
                    text: n[0],
                    type: n[1],
                    icon: n[2],
                    timestamp: now - n[3],
                    read: false,
                    feedbackId: null,
                    projectId: null
                });
            });
            notifs.sort(function (a, b) { return b.timestamp - a.timestamp; });
            FluxStorage.set('notifications', notifs);
        }

        FluxStorage.set('demo_seeded_' + user.id, true);
    }

    /**
     * Log in as a demo user, seeding data on first use.
     * @param {'client'|'agency'} role
     * @returns {Promise} FluxAPI-style response
     */
    function login(role) {
        if (!DEMO[role]) {
            return Promise.resolve({ ok: false, error: 'Unknown demo role: ' + role });
        }

        var user = _ensureUser(role);

        try {
            _seed(user);
        } catch (e) {
            console.warn('[FluxDemo] Seeding failed (non-fatal):', e);
        }

        return FluxAPI.login(DEMO[role].email, DEMO[role].password);
    }

    function getCredentials(role) {
        return DEMO[role] ? { email: DEMO[role].email, password: DEMO[role].password } : null;
    }

    return {
        login: login,
        getCredentials: getCredentials
    };
})();
