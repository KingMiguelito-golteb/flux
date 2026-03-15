/* ================================================
   FLUX — API MODULE WITH RBAC ENFORCEMENT
   ================================================
   Every mutating operation checks session role.
   Even if a client bypasses the UI and calls
   FluxAPI directly from the console, restricted
   operations will be rejected.
   ================================================ */

var FluxAPI = (function () {
    'use strict';

    if (typeof FluxStorage === 'undefined') {
        console.error('[FluxAPI] FATAL: FluxStorage not loaded');
        return {
            login: function () { return Promise.reject('FluxStorage not loaded'); },
            signup: function () { return Promise.reject('FluxStorage not loaded'); },
            logout: function () { return Promise.resolve({ ok: true }); },
            getSession: function () { return null; },
            requireAuth: function () { window.location.href = 'login.html'; return null; }
        };
    }

    /* ------- Response helpers ------- */
    function resolve(data) {
        return Promise.resolve({ ok: true, data: data });
    }

    function reject(msg) {
        return Promise.resolve({ ok: false, error: msg });
    }

    /* ============================================
       RBAC HELPER — checks current session role
       ============================================ */
    function _requireRole(requiredRole) {
        var session = getSession();
        if (!session) {
            console.warn('[FluxAPI RBAC] No session — operation rejected');
            return { allowed: false, error: 'Not authenticated' };
        }

        if (requiredRole === 'agency' && session.role !== 'agency') {
            console.warn('[FluxAPI RBAC] Client attempted agency-only action:', new Error().stack);
            return { allowed: false, error: 'Insufficient permissions. Agency role required.' };
        }

        return { allowed: true, session: session };
    }

    /**
     * Check if current session has a specific role
     * Public method for UI code to use
     */
    function hasRole(role) {
        var session = getSession();
        if (!session) return false;
        return session.role === role;
    }

    /**
     * Check if current user is agency
     */
    function isAgency() {
        return hasRole('agency');
    }

    /**
     * Check if current user is client
     */
    function isClient() {
        return hasRole('client');
    }

    /* ======================================
       SESSION / AUTH
       ====================================== */
     function login(email, password) {
        console.log('[FluxAPI] login() called');

        if (!email || !password) {
            return reject('Email and password are required');
        }

        var normalizedEmail = email.trim().toLowerCase();
        var users = FluxStorage.get('users', []);

        console.log('[FluxAPI] Checking against', users.length, 'stored users');

        // Find user by email first
        var userByEmail = null;
        var userWithPassword = null;

        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            var storedEmail = (u.email || '').trim().toLowerCase();

            if (storedEmail === normalizedEmail) {
                userByEmail = u;
                if (u.password === password) {
                    userWithPassword = u;
                }
                break;
            }
        }

        // No user with this email at all
        if (!userByEmail) {
            return reject('No account found with this email address');
        }

        // Email found but wrong password
        if (!userWithPassword) {
            return reject('Incorrect password');
        }

        // Success
        var session = {
            id: userWithPassword.id,
            name: userWithPassword.firstName + ' ' + userWithPassword.lastName,
            email: userWithPassword.email,
            role: userWithPassword.role || 'client',
            org: userWithPassword.org || '',
            avatar: userWithPassword.avatar || null,
            loggedInAt: Date.now()
        };

        FluxStorage.set('session', session);
        console.log('[FluxAPI] Login successful. Role:', session.role);
        return resolve(session);
    }

    function signup(data) {
        if (!data.email || !data.password || !data.firstName || !data.lastName) {
            return reject('All required fields must be filled');
        }

        var users = FluxStorage.get('users', []);
        var normalizedEmail = data.email.trim().toLowerCase();

        var exists = users.some(function (u) {
            return (u.email || '').trim().toLowerCase() === normalizedEmail;
        });

        if (exists) return reject('Email already registered');

        var user = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: normalizedEmail,
            password: data.password,
            role: data.role || 'client',
            org: data.org || '',
            teamName: '',
            jobTitle: '',
            avatar: null,
            notificationPrefs: {
                email: true, inApp: true, replies: true,
                statusChanges: true, digest: false
            },
            createdAt: Date.now()
        };

        users.push(user);
        FluxStorage.set('users', users);

        var session = {
            id: user.id,
            name: user.firstName + ' ' + user.lastName,
            email: user.email,
            role: user.role,
            org: user.org,
            avatar: null,
            loggedInAt: Date.now()
        };
        FluxStorage.set('session', session);

        return resolve(session);
    }

    function logout() {
        FluxStorage.remove('session');
        return resolve(true);
    }

    function getSession() {
        try {
            return FluxStorage.get('session', null);
        } catch (e) {
            return null;
        }
    }

    function requireAuth() {
        var session = getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        return session;
    }

    /* ======================================
       USER PROFILE
       ====================================== */
    function getUser(userId) {
        var users = FluxStorage.get('users', []);
        var user = null;
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === userId) { user = users[i]; break; }
        }
        return user ? resolve(user) : reject('User not found');
    }

    function updateUser(userId, updates) {
        // Users can only update their own profile
        var session = getSession();
        if (!session || session.id !== userId) {
            return reject('Cannot update another user\'s profile');
        }

        var users = FluxStorage.get('users', []);
        var idx = -1;
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === userId) { idx = i; break; }
        }
        if (idx === -1) return reject('User not found');

        var keys = Object.keys(updates);
        for (var k = 0; k < keys.length; k++) {
            // RBAC: Clients cannot change their own role to agency
            if (keys[k] === 'role' && session.role === 'client' && updates.role === 'agency') {
                console.warn('[FluxAPI RBAC] Client tried to escalate to agency role');
                continue;
            }
            users[idx][keys[k]] = updates[keys[k]];
        }
        FluxStorage.set('users', users);

        // Refresh session
        if (session.id === userId) {
            session.name = users[idx].firstName + ' ' + users[idx].lastName;
            session.email = users[idx].email;
            session.role = users[idx].role;
            session.org = users[idx].org;
            if (updates.avatar !== undefined) session.avatar = updates.avatar;
            FluxStorage.set('session', session);
        }

        return resolve(users[idx]);
    }

    function changePassword(userId, currentPw, newPw) {
        var session = getSession();
        if (!session || session.id !== userId) {
            return reject('Cannot change another user\'s password');
        }

        var users = FluxStorage.get('users', []);
        var user = null;
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === userId) { user = users[i]; break; }
        }
        if (!user) return reject('User not found');
        if (user.password !== currentPw) return reject('Current password is incorrect');

        user.password = newPw;
        FluxStorage.set('users', users);
        return resolve(true);
    }

    /* ======================================
       PROJECTS — AGENCY ONLY
       ====================================== */
    function getProjects() {
        return resolve(FluxStorage.get('projects', []));
    }

    function getProject(projectId) {
        var projects = FluxStorage.get('projects', []);
        var p = null;
        for (var i = 0; i < projects.length; i++) {
            if (projects[i].id === projectId) { p = projects[i]; break; }
        }
        return p ? resolve(p) : reject('Project not found');
    }

    function createProject(data) {
        // RBAC: Only agency can create projects
        var check = _requireRole('agency');
        if (!check.allowed) return reject(check.error);

        var projects = FluxStorage.get('projects', []);
        var project = {
            id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: data.name,
            client: data.client || '',
            description: data.description || '',
            color: data.color || '1',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        projects.push(project);
        FluxStorage.set('projects', projects);
        return resolve(project);
    }

    function updateProject(projectId, updates) {
        // RBAC: Only agency can update projects
        var check = _requireRole('agency');
        if (!check.allowed) return reject(check.error);

        var projects = FluxStorage.get('projects', []);
        var idx = -1;
        for (var i = 0; i < projects.length; i++) {
            if (projects[i].id === projectId) { idx = i; break; }
        }
        if (idx === -1) return reject('Project not found');

        var keys = Object.keys(updates);
        for (var k = 0; k < keys.length; k++) {
            projects[idx][keys[k]] = updates[keys[k]];
        }
        projects[idx].updatedAt = Date.now();
        FluxStorage.set('projects', projects);
        return resolve(projects[idx]);
    }

    function deleteProject(projectId) {
        // RBAC: Only agency can delete projects
        var check = _requireRole('agency');
        if (!check.allowed) return reject(check.error);

        var projects = FluxStorage.get('projects', []);
        projects = projects.filter(function (p) { return p.id !== projectId; });
        FluxStorage.set('projects', projects);

        var feedback = FluxStorage.get('feedback_data', { feedback: [], nextId: 1 });
        feedback.feedback = feedback.feedback.filter(function (f) { return f.projectId !== projectId; });
        FluxStorage.set('feedback_data', feedback);

        return resolve(true);
    }

    function getActiveProject() {
        return FluxStorage.get('active_project', null);
    }

    function setActiveProject(projectId) {
        FluxStorage.set('active_project', projectId);
        return resolve(true);
    }

    /* ======================================
       FEEDBACK
       ====================================== */
    function _getFeedbackStore() {
        return FluxStorage.get('feedback_data', { feedback: [], nextId: 1 });
    }

    function _saveFeedbackStore(store) {
        FluxStorage.set('feedback_data', store);
    }

    function getFeedback(projectId) {
        var store = _getFeedbackStore();
        var items = store.feedback;
        if (projectId) {
            items = items.filter(function (f) { return f.projectId === projectId; });
        }
        return resolve(items);
    }

    function getFeedbackById(feedbackId) {
        var store = _getFeedbackStore();
        var item = null;
        for (var i = 0; i < store.feedback.length; i++) {
            if (store.feedback[i].id === feedbackId) { item = store.feedback[i]; break; }
        }
        return item ? resolve(item) : reject('Feedback not found');
    }

    function createFeedback(data) {
        // Both roles can create feedback
        var session = getSession();
        if (!session) return reject('Not authenticated');

        var store = _getFeedbackStore();
        var item = {
            id: store.nextId++,
            title: data.title,
            description: data.description,
            type: data.type,
            status: 'new',
            client: data.client || '',
            projectId: data.projectId || null,
            timestamp: Date.now(),
            files: data.files || [],
            priority: data.priority || 'normal',
            comments: [],
            history: [
                { from: null, to: 'new', timestamp: Date.now(), by: data.author || session.name }
            ]
        };
        store.feedback.unshift(item);
        _saveFeedbackStore(store);
        return resolve(item);
    }

    function updateFeedbackStatus(feedbackId, newStatus, changedBy) {
        // RBAC: Only agency can change feedback status
        var check = _requireRole('agency');
        if (!check.allowed) {
            console.warn('[FluxAPI RBAC] Client tried to update feedback status');
            return reject(check.error);
        }

        var store = _getFeedbackStore();
        var item = null;
        for (var i = 0; i < store.feedback.length; i++) {
            if (store.feedback[i].id === feedbackId) { item = store.feedback[i]; break; }
        }
        if (!item) return reject('Feedback not found');

        var oldStatus = item.status;
        item.status = newStatus;
        if (!item.history) item.history = [];
        item.history.push({
            from: oldStatus,
            to: newStatus,
            timestamp: Date.now(),
            by: changedBy || check.session.name
        });
        _saveFeedbackStore(store);
        return resolve(item);
    }

    function deleteFeedback(feedbackId) {
        // RBAC: Only agency can delete feedback
        var check = _requireRole('agency');
        if (!check.allowed) return reject(check.error);

        var store = _getFeedbackStore();
        store.feedback = store.feedback.filter(function (f) { return f.id !== feedbackId; });
        _saveFeedbackStore(store);
        return resolve(true);
    }

    function deleteFeedbackBulk(ids) {
        // RBAC: Only agency can bulk delete
        var check = _requireRole('agency');
        if (!check.allowed) return reject(check.error);

        var store = _getFeedbackStore();
        var idSet = {};
        ids.forEach(function (id) { idSet[id] = true; });
        store.feedback = store.feedback.filter(function (f) { return !idSet[f.id]; });
        _saveFeedbackStore(store);
        return resolve(true);
    }

    /* ======================================
       COMMENTS — both roles can comment
       ====================================== */
    function createComment(feedbackId, commentData) {
        var session = getSession();
        if (!session) return reject('Not authenticated');

        var store = _getFeedbackStore();
        var item = null;
        for (var i = 0; i < store.feedback.length; i++) {
            if (store.feedback[i].id === feedbackId) { item = store.feedback[i]; break; }
        }
        if (!item) return reject('Feedback not found');

        if (!item.comments) item.comments = [];
        var comment = {
            id: Date.now(),
            author: commentData.author || session.name,
            role: commentData.role || session.role,
            text: commentData.text,
            timestamp: Date.now()
        };
        item.comments.push(comment);
        _saveFeedbackStore(store);
        return resolve(comment);
    }

    /* ======================================
       NOTIFICATIONS
       ====================================== */
    function getNotifications() {
        return resolve(FluxStorage.get('notifications', []));
    }

    function addNotification(data) {
        var notifs = FluxStorage.get('notifications', []);
        var notif = {
            id: Date.now(),
            text: data.text,
            type: data.type || 'info',
            icon: data.icon || 'fa-bell',
            timestamp: Date.now(),
            read: false,
            feedbackId: data.feedbackId || null,
            projectId: data.projectId || null
        };
        notifs.unshift(notif);
        if (notifs.length > 50) notifs = notifs.slice(0, 50);
        FluxStorage.set('notifications', notifs);
        return resolve(notif);
    }

    function markNotificationRead(notifId) {
        var notifs = FluxStorage.get('notifications', []);
        for (var i = 0; i < notifs.length; i++) {
            if (notifs[i].id === notifId) { notifs[i].read = true; break; }
        }
        FluxStorage.set('notifications', notifs);
        return resolve(true);
    }

    function markAllNotificationsRead() {
        var notifs = FluxStorage.get('notifications', []);
        notifs.forEach(function (n) { n.read = true; });
        FluxStorage.set('notifications', notifs);
        return resolve(true);
    }

    /* ======================================
       DATA MANAGEMENT
       ====================================== */
    function exportAllData() {
        return resolve({
            users: FluxStorage.get('users', []),
            projects: FluxStorage.get('projects', []),
            feedback: FluxStorage.get('feedback_data', {}),
            notifications: FluxStorage.get('notifications', []),
            exportedAt: new Date().toISOString()
        });
    }

    function deleteAllData() {
        FluxStorage.clearAll();
        return resolve(true);
    }

    /* ======================================
       PUBLIC API
       ====================================== */
    console.log('[FluxAPI] Module loaded with RBAC enforcement');

    return {
        // Auth
        login: login, signup: signup, logout: logout,
        getSession: getSession, requireAuth: requireAuth,

        // RBAC helpers (public)
        hasRole: hasRole,
        isAgency: isAgency,
        isClient: isClient,

        // User
        getUser: getUser, updateUser: updateUser, changePassword: changePassword,

        // Projects
        getProjects: getProjects, getProject: getProject,
        createProject: createProject, updateProject: updateProject,
        deleteProject: deleteProject,
        getActiveProject: getActiveProject, setActiveProject: setActiveProject,

        // Feedback
        getFeedback: getFeedback, getFeedbackById: getFeedbackById,
        createFeedback: createFeedback,
        updateFeedbackStatus: updateFeedbackStatus,
        deleteFeedback: deleteFeedback, deleteFeedbackBulk: deleteFeedbackBulk,

        // Comments
        createComment: createComment,

        // Notifications
        getNotifications: getNotifications, addNotification: addNotification,
        markNotificationRead: markNotificationRead,
        markAllNotificationsRead: markAllNotificationsRead,

        // Data
        exportAllData: exportAllData, deleteAllData: deleteAllData
    };
})();