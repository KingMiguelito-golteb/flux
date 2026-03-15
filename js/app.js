/* ================================================
   FLUX — DASHBOARD (app.js) WITH RBAC + ANALYTICS + TIMELINE
   ================================================
   Role-based access control enforced at:
   1. UI visibility (.agency-only class)
   2. Event handler guards (isAgency checks)
   3. API layer (server-side-style rejection)
   ================================================ */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ============================================
    // SPLASH SCREEN — hide after init
    // ============================================
    if (typeof FluxSplash !== 'undefined') {
        FluxSplash.hide();
    }

    // ============================================
    // AUTH & ROLE DETECTION
    // ============================================
    var session = FluxAPI.requireAuth();
    if (!session) return;

    var isAgency = session.role === 'agency';
    var isClient = session.role === 'client';

    console.log('[Dashboard] Loaded. Role:', session.role, '| Agency:', isAgency);

    // ============================================
    // APPLY ROLE TO BODY CLASS
    // This drives all CSS-based .agency-only hiding
    // ============================================
    if (isClient) {
        document.body.classList.add('role-client');
        document.body.classList.remove('role-agency');
    } else {
        document.body.classList.add('role-agency');
        document.body.classList.remove('role-client');
    }

    // ============================================
    // INIT SHARED MODULES
    // ============================================
    FluxNav.init();
    FluxNotifications.init();

    // ============================================
    // RENDER ROLE BADGE IN HEADER
    // ============================================
    var badgeContainer = document.getElementById('roleBadgeContainer');
    if (badgeContainer) {
        if (isClient) {
            badgeContainer.innerHTML =
                '<span class="role-badge client-badge">' +
                '<i class="fas fa-user"></i> Client' +
                '</span>';
        } else {
            badgeContainer.innerHTML =
                '<span class="role-badge agency-badge">' +
                '<i class="fas fa-building"></i> Agency' +
                '</span>';
        }
    }

    // ============================================
    // CONSTANTS
    // ============================================
    var STATUS_MAP = {
        new: 'New Feedback', review: 'In Review',
        awaiting: 'Awaiting Client', approved: 'Approved'
    };
    var TYPE_LABELS = { design: 'Design', technical: 'Technical', copy: 'Copy/Text', bug: 'Bug Report' };
    var TYPE_ICONS = { design: 'fa-palette', technical: 'fa-code', copy: 'fa-font', bug: 'fa-bug' };
    var PRIORITY_LABELS = { urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' };
    var FILE_ICONS = { pdf: 'fa-file-pdf', png: 'fa-file-image', jpg: 'fa-file-image', jpeg: 'fa-file-image', psd: 'fa-file-image', ai: 'fa-file-lines' };

    // ============================================
    // STATE
    // ============================================
    var state = {
        // RBAC: Force client view for client role
        viewMode: isAgency ? 'agency' : 'client',
        selectedIds: new Set(),
        activeFilters: {
            types: ['design', 'technical', 'copy', 'bug'],
            priorities: ['urgent', 'high', 'normal', 'low']
        },
        searchQuery: '',
        currentDetailId: null,
        uploadedFiles: [],
        draggedId: null,
        pendingConvertIds: []
    };

    // ============================================
    // DOM CACHE
    // ============================================
    var $ = function (s) { return document.querySelector(s); };
    var $$ = function (s) { return document.querySelectorAll(s); };

    var dom = {
        searchInput: $('#searchInput'),
        searchClear: $('#searchClear'),
        filterTypeBtn: $('#filterTypeBtn'),
        filterTypeMenu: $('#filterTypeMenu'),
        filterPriorityBtn: $('#filterPriorityBtn'),
        filterPriorityMenu: $('#filterPriorityMenu'),
        filterReset: $('#filterReset'),
        clientViewBtn: $('#clientViewBtn'),
        agencyViewBtn: $('#agencyViewBtn'),
        metricTotal: $('#metricTotal'),
        metricResolved: $('#metricResolved'),
        metricPending: $('#metricPending'),
        metricFiles: $('#metricFiles'),
        bulkActionsBar: $('#bulkActionsBar'),
        bulkCount: $('#bulkCount'),
        bulkApprove: $('#bulkApprove'),
        bulkConvert: $('#bulkConvert'),
        bulkDelete: $('#bulkDelete'),
        bulkDeselect: $('#bulkDeselect'),
        kanbanBoard: $('#kanbanBoard'),
        cardsNew: $('#cardsNew'),
        cardsReview: $('#cardsReview'),
        cardsAwaiting: $('#cardsAwaiting'),
        cardsApproved: $('#cardsApproved'),
        countNew: $('#countNew'),
        countReview: $('#countReview'),
        countAwaiting: $('#countAwaiting'),
        countApproved: $('#countApproved'),
        fabNewFeedback: $('#fabNewFeedback'),
        modalSubmitFeedback: $('#modalSubmitFeedback'),
        closeSubmitModal: $('#closeSubmitModal'),
        feedbackForm: $('#feedbackForm'),
        feedbackTitle: $('#feedbackTitle'),
        feedbackPriority: $('#feedbackPriority'),
        feedbackDescription: $('#feedbackDescription'),
        titleCharCount: $('#titleCharCount'),
        fileUploadArea: $('#fileUploadArea'),
        fileInput: $('#fileInput'),
        filePreviewList: $('#filePreviewList'),
        cancelSubmitFeedback: $('#cancelSubmitFeedback'),
        submitFeedback: $('#submitFeedback'),
        modalFeedbackDetail: $('#modalFeedbackDetail'),
        closeDetailModal: $('#closeDetailModal'),
        detailTitle: $('#detailTitle'),
        detailStatus: $('#detailStatus'),
        detailType: $('#detailType'),
        detailPriority: $('#detailPriority'),
        detailClient: $('#detailClient'),
        detailTimestamp: $('#detailTimestamp'),
        detailDescription: $('#detailDescription'),
        detailFilesSection: $('#detailFilesSection'),
        detailFileList: $('#detailFileList'),
        detailHistory: $('#detailHistory'),
        detailStatusSelect: $('#detailStatusSelect'),
        commentsThread: $('#commentsThread'),
        commentInput: $('#commentInput'),
        commentAvatar: $('#commentAvatar'),
        postComment: $('#postComment'),
        modalConvertTask: $('#modalConvertTask'),
        closeConvertModal: $('#closeConvertModal'),
        taskTitle: $('#taskTitle'),
        taskAssignee: $('#taskAssignee'),
        taskDeadline: $('#taskDeadline'),
        taskHours: $('#taskHours'),
        cancelConvertTask: $('#cancelConvertTask'),
        confirmConvertTask: $('#confirmConvertTask'),
        shortcutsHelp: $('#shortcutsHelp'),
        currentProject: $('#currentProject'),
        projectSelector: $('#projectSelector'),
        roleBadgeContainer: $('#roleBadgeContainer'),
        
        // ============================================
        // ANALYTICS DOM ELEMENTS
        // ============================================
        analyticsToggle: $('#analyticsToggle'),
        analyticsContent: $('#analyticsContent'),
        analyticsChevron: $('#analyticsChevron'),
        resolutionRing: $('#resolutionRing'),
        resolutionPercent: $('#resolutionPercent'),
        feedbackByType: $('#feedbackByType'),
        feedbackByPriority: $('#feedbackByPriority'),
        avgResolutionTime: $('#avgResolutionTime'),
        miniStats: $('#miniStats')
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        loadActiveProject();
        setupEventListeners();
        setupColumnDropZones();
        syncViewMode();
        renderAll();
        checkUrlParams();
        setupAnalytics();

        console.log('[Dashboard] Initialized. View mode:', state.viewMode);

        // Hide splash after page is ready
if (typeof FluxSplash !== 'undefined') {
    FluxSplash.hide();
}
    }

    function loadActiveProject() {
        var activeId = FluxAPI.getActiveProject();
        if (activeId) {
            FluxAPI.getProject(activeId).then(function (res) {
                if (res.ok) {
                    dom.currentProject.textContent = (res.data.client || '') + ' — ' + res.data.name;
                } else {
                    dom.currentProject.textContent = 'No project selected';
                }
            });
        } else {
            dom.currentProject.textContent = 'Select a project';
        }
    }

    function checkUrlParams() {
        var params = new URLSearchParams(window.location.search);
        var detailId = params.get('detail');
        if (detailId) {
            openDetailModal(parseInt(detailId));
            window.history.replaceState({}, '', 'dashboard.html');
        }
    }

    // ============================================
    // ANALYTICS SETUP
    // ============================================
    function setupAnalytics() {
        if (dom.analyticsToggle && dom.analyticsContent) {
            dom.analyticsToggle.addEventListener('click', function () {
                var isHidden = dom.analyticsContent.classList.contains('hidden');
                dom.analyticsContent.classList.toggle('hidden');
                if (dom.analyticsChevron) dom.analyticsChevron.classList.toggle('rotated', isHidden);
                if (isHidden) renderAnalytics();
            });
        }
    }

    function renderAnalytics() {
        var all = getAllFeedback();
        if (all.length === 0) return;

        var total = all.length;
        var resolved = all.filter(function (f) { return f.status === 'approved'; }).length;
        var resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        // Resolution ring
        var ring = dom.resolutionRing;
        var percent = dom.resolutionPercent;
        if (ring && percent) {
            var circumference = 2 * Math.PI * 42;
            var offset = circumference - (resolutionRate / 100) * circumference;
            ring.style.strokeDasharray = circumference;
            setTimeout(function () {
                ring.style.strokeDashoffset = offset;
            }, 100);
            percent.textContent = resolutionRate + '%';
        }

        // Feedback by type
        var typeContainer = dom.feedbackByType;
        if (typeContainer) {
            var typeCounts = { design: 0, technical: 0, copy: 0, bug: 0 };
            all.forEach(function (f) { if (typeCounts[f.type] !== undefined) typeCounts[f.type]++; });
            var maxType = Math.max.apply(null, Object.values(typeCounts)) || 1;

            typeContainer.innerHTML = Object.keys(typeCounts).map(function (type) {
                var count = typeCounts[type];
                var pct = Math.round((count / maxType) * 100);
                var labels = { design: 'Design', technical: 'Technical', copy: 'Copy', bug: 'Bug' };
                return '<div class="analytics-bar-row">' +
                    '<span class="analytics-bar-label">' + labels[type] + '</span>' +
                    '<div class="analytics-bar-track">' +
                    '<div class="analytics-bar-fill ' + type + '" style="width: ' + pct + '%"></div>' +
                    '</div>' +
                    '<span class="analytics-bar-value">' + count + '</span>' +
                    '</div>';
            }).join('');
        }

        // Feedback by priority
        var priorityContainer = dom.feedbackByPriority;
        if (priorityContainer) {
            var prioCounts = { urgent: 0, high: 0, normal: 0, low: 0 };
            all.forEach(function (f) { if (prioCounts[f.priority] !== undefined) prioCounts[f.priority]++; });
            var maxPrio = Math.max.apply(null, Object.values(prioCounts)) || 1;

            priorityContainer.innerHTML = Object.keys(prioCounts).map(function (prio) {
                var count = prioCounts[prio];
                var pct = Math.round((count / maxPrio) * 100);
                var labels = { urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' };
                return '<div class="analytics-bar-row">' +
                    '<span class="analytics-bar-label">' + labels[prio] + '</span>' +
                    '<div class="analytics-bar-track">' +
                    '<div class="analytics-bar-fill ' + prio + '" style="width: ' + pct + '%"></div>' +
                    '</div>' +
                    '<span class="analytics-bar-value">' + count + '</span>' +
                    '</div>';
            }).join('');
        }

        // Average resolution time
        var avgContainer = dom.avgResolutionTime;
        var miniStats = dom.miniStats;
        if (avgContainer) {
            var resolvedItems = all.filter(function (f) {
                return f.status === 'approved' && f.history && f.history.length > 1;
            });

            if (resolvedItems.length > 0) {
                var totalHours = 0;
                var fastest = Infinity;
                var slowest = 0;

                resolvedItems.forEach(function (f) {
                    var created = f.history[0].timestamp;
                    var approved = f.history[f.history.length - 1].timestamp;
                    var hours = (approved - created) / (1000 * 60 * 60);
                    totalHours += hours;
                    if (hours < fastest) fastest = hours;
                    if (hours > slowest) slowest = hours;
                });

                var avgHours = totalHours / resolvedItems.length;
                var avgDays = avgHours / 24;

                if (avgDays >= 1) {
                    avgContainer.innerHTML = '<span class="big-num">' + avgDays.toFixed(1) + '</span><span class="big-unit">days</span>';
                } else {
                    avgContainer.innerHTML = '<span class="big-num">' + Math.round(avgHours) + '</span><span class="big-unit">hours</span>';
                }

                if (miniStats) {
                    miniStats.innerHTML =
                        '<div class="mini-stat"><div class="mini-stat-value">' + formatDuration(fastest) + '</div><div class="mini-stat-label">Fastest</div></div>' +
                        '<div class="mini-stat"><div class="mini-stat-value">' + formatDuration(slowest) + '</div><div class="mini-stat-label">Slowest</div></div>' +
                        '<div class="mini-stat"><div class="mini-stat-value">' + resolvedItems.length + '</div><div class="mini-stat-label">Resolved</div></div>';
                }
            } else {
                avgContainer.innerHTML = '<span class="big-num">—</span><span class="big-unit"></span>';
                if (miniStats) miniStats.innerHTML = '<div class="mini-stat"><div class="mini-stat-label">No resolved items yet</div></div>';
            }
        }
    }

    function formatDuration(hours) {
        if (hours >= 24) return (hours / 24).toFixed(1) + 'd';
        if (hours >= 1) return Math.round(hours) + 'h';
        return Math.round(hours * 60) + 'm';
    }

    // ============================================
    // DATA ACCESS
    // ============================================
    function getAllFeedback() {
        var store = FluxStorage.get('feedback_data', { feedback: [], nextId: 1 });
        var activeProject = FluxAPI.getActiveProject();
        var items = store.feedback;
        if (activeProject) {
            items = items.filter(function (f) { return f.projectId === activeProject; });
        }
        return items;
    }

    function getFilteredFeedback() {
        var items = getAllFeedback();
        items = items.filter(function (f) { return state.activeFilters.types.indexOf(f.type) !== -1; });
        items = items.filter(function (f) { return state.activeFilters.priorities.indexOf(f.priority) !== -1; });

        if (state.searchQuery.trim()) {
            var q = state.searchQuery.toLowerCase().trim();
            items = items.filter(function (f) {
                return f.title.toLowerCase().indexOf(q) !== -1 ||
                       f.description.toLowerCase().indexOf(q) !== -1 ||
                       (f.client || '').toLowerCase().indexOf(q) !== -1;
            });
        }
        return items;
    }

    // ============================================
    // RENDER
    // ============================================
    function renderAll() {
        renderKanbanEnhanced();
        renderMetrics();
        updateBulkBar();
        FluxNotifications.updateBadge();
        checkBoardEmpty();
    }

    function renderKanban() {
        var filtered = getFilteredFeedback();
        var columns = { new: [], review: [], awaiting: [], approved: [] };

        filtered.forEach(function (item) {
            if (columns[item.status]) columns[item.status].push(item);
        });

        renderColumn(dom.cardsNew, columns.new, dom.countNew, 'new');
        renderColumn(dom.cardsReview, columns.review, dom.countReview, 'review');
        renderColumn(dom.cardsAwaiting, columns.awaiting, dom.countAwaiting, 'awaiting');
        renderColumn(dom.cardsApproved, columns.approved, dom.countApproved, 'approved');
    }

    // ENHANCED RENDER KANBAN WITH BETTER EMPTY STATES
    function renderKanbanEnhanced() {
        var filtered = getFilteredFeedback();
        var columns = { new: [], review: [], awaiting: [], approved: [] };

        filtered.forEach(function (item) {
            if (columns[item.status]) columns[item.status].push(item);
        });

        renderColumnEnhanced(dom.cardsNew, columns.new, dom.countNew, 'new');
        renderColumnEnhanced(dom.cardsReview, columns.review, dom.countReview, 'review');
        renderColumnEnhanced(dom.cardsAwaiting, columns.awaiting, dom.countAwaiting, 'awaiting');
        renderColumnEnhanced(dom.cardsApproved, columns.approved, dom.countApproved, 'approved');
    }

    // ENHANCED EMPTY STATES
    function renderColumnEnhanced(container, items, countEl, status) {
        countEl.textContent = items.length;
        container.innerHTML = '';

        if (items.length === 0) {
            var msgs = {
                new: {
                    icon: 'fa-inbox',
                    title: 'No new feedback',
                    text: isClient
                        ? 'Click the + button to submit your first feedback'
                        : 'Waiting for client submissions'
                },
                review: {
                    icon: 'fa-search',
                    title: 'Nothing in review',
                    text: isAgency
                        ? 'Drag new feedback here to start reviewing'
                        : 'Your feedback is being processed'
                },
                awaiting: {
                    icon: 'fa-hourglass-half',
                    title: 'Nothing awaiting',
                    text: isClient
                        ? 'No items need your input right now'
                        : 'No items waiting for client response'
                },
                approved: {
                    icon: 'fa-check-double',
                    title: 'Nothing approved yet',
                    text: 'Approved feedback will appear here'
                }
            };
            var m = msgs[status] || { icon: 'fa-folder-open', title: 'Empty', text: '' };

            container.innerHTML =
                '<div class="flux-empty-state compact">' +
                '<div class="flux-empty-icon"><i class="fas ' + m.icon + '"></i></div>' +
                '<div class="flux-empty-title">' + m.title + '</div>' +
                '<div class="flux-empty-text">' + m.text + '</div>' +
                '</div>';
            return;
        }

        items.forEach(function (item) {
            container.appendChild(createCardElement(item));
        });
    }

    // Check if the board is completely empty (no feedback at all)
    function checkBoardEmpty() {
        var all = getAllFeedback();
        var board = dom.kanbanBoard;
        var existingEmpty = document.getElementById('boardEmptyState');

        if (all.length === 0 && board) {
            if (!existingEmpty) {
                var emptyDiv = document.createElement('div');
                emptyDiv.id = 'boardEmptyState';
                emptyDiv.className = 'flux-empty-state';
                emptyDiv.style.gridColumn = '1 / -1';
                emptyDiv.innerHTML =
                    '<div class="flux-empty-icon" style="width:100px;height:100px;font-size:2.5rem;">' +
                    '<i class="fas fa-comments"></i></div>' +
                    '<div class="flux-empty-title">No feedback yet</div>' +
                    '<div class="flux-empty-text">' +
                    (isClient
                        ? 'Submit your first piece of feedback to get started. Click the purple + button below.'
                        : 'No feedback has been submitted for this project yet. Share the project link with your client to get started.') +
                    '</div>' +
                    '<div class="flux-empty-action">' +
                    '<button class="flux-btn flux-btn-primary" onclick="document.getElementById(\'fabNewFeedback\').click()">' +
                    '<i class="fas fa-plus"></i> Submit Feedback</button></div>';

                board.prepend(emptyDiv);
            }
        } else if (existingEmpty) {
            existingEmpty.remove();
        }
    }

    function renderColumn(container, items, countEl, status) {
        countEl.textContent = items.length;
        container.innerHTML = '';

        if (items.length === 0) {
            var msgs = {
                new: { icon: 'fa-inbox', text: 'No new feedback', sub: 'New submissions appear here' },
                review: { icon: 'fa-search', text: 'Nothing in review', sub: 'Items being reviewed' },
                awaiting: { icon: 'fa-hourglass-half', text: 'Nothing awaiting', sub: 'Awaiting client input' },
                approved: { icon: 'fa-check-double', text: 'Nothing approved', sub: 'Approved items here' }
            };
            var m = msgs[status] || { icon: 'fa-folder-open', text: 'Empty', sub: '' };
            container.innerHTML =
                '<div class="empty-state">' +
                '<div class="empty-state-icon"><i class="fas ' + m.icon + '"></i></div>' +
                '<div class="empty-state-text">' + m.text + '</div>' +
                '<div class="empty-state-sub">' + m.sub + '</div></div>';
            return;
        }

        items.forEach(function (item) {
            container.appendChild(createCardElement(item));
        });
    }

    function createCardElement(item) {
        var card = document.createElement('div');
        card.className = 'feedback-card status-' + item.status;
        card.dataset.id = item.id;

        if (state.selectedIds.has(item.id)) card.classList.add('selected');

        // RBAC: Only make draggable for agency in agency view mode
        if (isAgency && state.viewMode === 'agency') {
            card.draggable = true;
        } else {
            card.draggable = false;
        }

        var fileCount = item.files ? item.files.length : 0;
        var commentCount = item.comments ? item.comments.length : 0;

        card.innerHTML =
            '<span class="card-tag ' + item.type + '">' +
            '<i class="fas ' + (TYPE_ICONS[item.type] || 'fa-tag') + '"></i> ' +
            (TYPE_LABELS[item.type] || item.type) + '</span>' +
            '<div class="card-title">' + escapeHtml(item.title) + '</div>' +
            '<div class="card-desc">' + escapeHtml(item.description) + '</div>' +
            '<div class="card-footer">' +
            '<span class="card-client"><i class="fas fa-user-circle"></i> ' + escapeHtml(item.client || '') + '</span>' +
            '<div class="card-meta">' +
            (fileCount > 0 ? '<span class="card-meta-item"><i class="fas fa-paperclip"></i> ' + fileCount + '</span>' : '') +
            (commentCount > 0 ? '<span class="card-meta-item"><i class="fas fa-comment"></i> ' + commentCount + '</span>' : '') +
            '<span class="card-meta-item"><i class="fas fa-clock"></i> ' + timeAgo(item.timestamp) + '</span>' +
            '<span class="priority-dot ' + item.priority + '" title="' + (PRIORITY_LABELS[item.priority] || '') + '"></span>' +
            '</div></div>';

        card.addEventListener('click', function (e) {
            // RBAC: Only agency can select cards for bulk actions
            if (isAgency && state.viewMode === 'agency' && (e.ctrlKey || e.metaKey || state.selectedIds.size > 0)) {
                toggleSelectCard(item.id);
            } else {
                // Both roles can open the detail modal
                openDetailModal(item.id);
            }
        });

        // RBAC: Only attach drag listeners for agency
        if (isAgency) {
            card.addEventListener('dragstart', onDragStart);
            card.addEventListener('dragend', onDragEnd);
        }

        return card;
    }

    function renderMetrics() {
        var all = getAllFeedback();
        animateValue(dom.metricTotal, all.length);
        animateValue(dom.metricResolved, all.filter(function (f) { return f.status === 'approved'; }).length);
        animateValue(dom.metricPending, all.filter(function (f) { return f.status !== 'approved'; }).length);
        animateValue(dom.metricFiles, all.reduce(function (sum, f) { return sum + (f.files ? f.files.length : 0); }, 0));
    }

    function animateValue(el, target) {
        if (!el) return;
        var current = parseInt(el.textContent) || 0;
        if (current === target) { el.textContent = target; return; }
        var diff = target - current;
        var steps = Math.min(Math.abs(diff), 15);
        var stepSize = diff / steps;
        var step = 0;
        var interval = setInterval(function () {
            step++;
            if (step >= steps) { el.textContent = target; clearInterval(interval); }
            else { el.textContent = Math.round(current + stepSize * step); }
        }, 30);
    }

    // ============================================
    // VIEW MODE — RBAC ENFORCED
    // ============================================
    function syncViewMode() {
        // RBAC: Force client-only mode for client role
        if (isClient) {
            state.viewMode = 'client';
        }

        if (dom.clientViewBtn) dom.clientViewBtn.classList.toggle('active', state.viewMode === 'client');
        if (dom.agencyViewBtn) dom.agencyViewBtn.classList.toggle('active', state.viewMode === 'agency');

        updateCommentAvatar();
    }

    function switchView(mode) {
        // RBAC: Clients cannot switch to agency view
        if (mode === 'agency' && isClient) {
            FluxToast.show('Agency view requires agency permissions', 'warning');
            console.warn('[RBAC] Client tried to switch to agency view');
            return;
        }

        state.viewMode = mode;
        state.selectedIds.clear();
        syncViewMode();
        updateBulkBar();
        renderKanbanEnhanced();
        FluxToast.show('Switched to ' + (mode === 'client' ? 'Client' : 'Agency') + ' View', 'info');
    }

    function updateCommentAvatar() {
        if (!dom.commentAvatar) return;
        var initials = getInitials(session.name);
        dom.commentAvatar.textContent = initials;
        dom.commentAvatar.className = 'comment-avatar ' + session.role;
    }

    // ============================================
    // SELECTION & BULK ACTIONS — AGENCY ONLY
    // ============================================
    function toggleSelectCard(id) {
        // RBAC: Only agency can select cards
        if (!isAgency || state.viewMode !== 'agency') {
            return;
        }

        if (state.selectedIds.has(id)) state.selectedIds.delete(id);
        else state.selectedIds.add(id);

        var cardEl = document.querySelector('.feedback-card[data-id="' + id + '"]');
        if (cardEl) cardEl.classList.toggle('selected', state.selectedIds.has(id));
        updateBulkBar();
    }

    function updateBulkBar() {
        // RBAC: Bulk actions only visible to agency
        if (!isAgency) {
            if (dom.bulkActionsBar) dom.bulkActionsBar.classList.add('hidden');
            return;
        }

        var count = state.selectedIds.size;
        if (count > 0 && state.viewMode === 'agency') {
            dom.bulkActionsBar.classList.remove('hidden');
            dom.bulkCount.textContent = count;
        } else {
            dom.bulkActionsBar.classList.add('hidden');
        }
    }

    function bulkApprove() {
        // RBAC: Double-check
        if (!isAgency) {
            FluxToast.show('Permission denied', 'error');
            return;
        }

        var ids = Array.from(state.selectedIds);
        var promises = ids.map(function (id) {
            return FluxAPI.updateFeedbackStatus(id, 'approved', session.name);
        });

        Promise.all(promises).then(function (results) {
            var failed = results.filter(function (r) { return !r.ok; });
            if (failed.length > 0) {
                FluxToast.show('Some items could not be approved: ' + failed[0].error, 'error');
            } else {
                FluxNotifications.push(ids.length + ' item(s) approved', 'success', 'fa-check-circle');
                FluxToast.show(ids.length + ' item(s) approved', 'success');
            }
            state.selectedIds.clear();
            renderAll();
        });
    }

    function bulkDelete() {
        // RBAC: Double-check
        if (!isAgency) {
            FluxToast.show('Permission denied', 'error');
            return;
        }

        var count = state.selectedIds.size;
        if (!confirm('Delete ' + count + ' item(s)? This cannot be undone.')) return;

        FluxAPI.deleteFeedbackBulk(Array.from(state.selectedIds)).then(function (res) {
            if (res.ok) {
                FluxNotifications.push(count + ' feedback item(s) deleted', 'danger', 'fa-trash');
                FluxToast.show(count + ' item(s) deleted', 'error');
            } else {
                FluxToast.show('Delete failed: ' + res.error, 'error');
            }
            state.selectedIds.clear();
            renderAll();
        });
    }

    // ============================================
    // DRAG AND DROP — AGENCY ONLY
    // ============================================
    function onDragStart(e) {
        // RBAC: Prevent drag for clients
        if (!isAgency || state.viewMode !== 'agency') {
            e.preventDefault();
            return;
        }

        var card = e.target.closest('.feedback-card');
        if (!card) return;

        state.draggedId = parseInt(card.dataset.id);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', state.draggedId);
    }

    function onDragEnd(e) {
        var card = e.target.closest('.feedback-card');
        if (card) {
            card.classList.remove('dragging');
            card.style.opacity = '';
        }
        $$('.kanban-column').forEach(function (col) { col.classList.remove('drag-over'); });
        state.draggedId = null;
    }

    function setupColumnDropZones() {
        $$('.kanban-column').forEach(function (column) {
            column.addEventListener('dragover', function (e) {
                // RBAC: Only allow drag over for agency
                if (!isAgency || state.viewMode !== 'agency') return;

                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', function (e) {
                if (!column.contains(e.relatedTarget)) {
                    column.classList.remove('drag-over');
                }
            });

            column.addEventListener('drop', function (e) {
                e.preventDefault();
                column.classList.remove('drag-over');

                // RBAC: Reject drop for clients
                if (!isAgency) {
                    console.warn('[RBAC] Client attempted drag-drop status change');
                    FluxToast.show('Permission denied: Cannot change status', 'error');
                    return;
                }

                var id = parseInt(e.dataTransfer.getData('text/plain'));
                var newStatus = column.dataset.status;
                if (!id || !newStatus) return;

                var store = FluxStorage.get('feedback_data', { feedback: [], nextId: 1 });
                var item = null;
                for (var i = 0; i < store.feedback.length; i++) {
                    if (store.feedback[i].id === id) { item = store.feedback[i]; break; }
                }
                if (!item) return;

                var oldStatus = item.status;
                if (oldStatus === newStatus) return;

                // Use API (which also checks role)
                FluxAPI.updateFeedbackStatus(id, newStatus, session.name).then(function (res) {
                    if (res.ok) {
                        FluxNotifications.push(
                            '"' + item.title + '" moved to ' + STATUS_MAP[newStatus],
                            'warning', 'fa-arrows-alt', id
                        );
                        renderAll();
                        FluxToast.show('Moved to ' + STATUS_MAP[newStatus], 'success');

                        if (newStatus === 'approved') {
                            setTimeout(function () { openConvertModal([id]); }, 300);
                        }
                    } else {
                        FluxToast.show('Failed: ' + res.error, 'error');
                        renderAll();
                    }
                });
            });
        });
    }

    // ============================================
    // ACTIVITY TIMELINE (replaces separate
    // history + comments in detail modal)
    // ============================================
    function renderActivityTimeline(item) {
        var activities = [];

        // Gather history entries
        if (item.history) {
            item.history.forEach(function (h) {
                activities.push({
                    type: h.from === null ? 'created' : 'status',
                    timestamp: h.timestamp,
                    author: h.by || 'System',
                    data: h
                });
            });
        }

        // Gather comments
        if (item.comments) {
            item.comments.forEach(function (c) {
                activities.push({
                    type: 'comment',
                    timestamp: c.timestamp,
                    author: c.author,
                    role: c.role,
                    data: c
                });
            });
        }

        // Sort chronologically
        activities.sort(function (a, b) { return a.timestamp - b.timestamp; });

        if (activities.length === 0) {
            return '<div class="flux-empty-state compact">' +
                '<div class="flux-empty-icon"><i class="fas fa-stream"></i></div>' +
                '<div class="flux-empty-title">No activity yet</div>' +
                '<div class="flux-empty-text">Status changes and comments will appear here</div>' +
                '</div>';
        }

        var html = '<div class="activity-timeline">';

        activities.forEach(function (act) {
            if (act.type === 'created') {
                html += '<div class="activity-item type-created">' +
                    '<div class="activity-header">' +
                    '<span class="activity-author">' + escapeHtml(act.author) + '</span>' +
                    '<span class="activity-action">created this feedback</span>' +
                    '<span class="activity-time">' + timeAgo(act.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="activity-status-change">' +
                    'Set to <span class="activity-status-tag ' + act.data.to + '">' + (STATUS_MAP[act.data.to] || act.data.to) + '</span>' +
                    '</div>' +
                    '</div>';
            } else if (act.type === 'status') {
                html += '<div class="activity-item type-status">' +
                    '<div class="activity-header">' +
                    '<span class="activity-author">' + escapeHtml(act.author) + '</span>' +
                    '<span class="activity-action">changed status</span>' +
                    '<span class="activity-time">' + timeAgo(act.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="activity-status-change">' +
                    '<span class="activity-status-tag ' + act.data.from + '">' + (STATUS_MAP[act.data.from] || act.data.from) + '</span>' +
                    '<i class="fas fa-arrow-right activity-status-arrow"></i>' +
                    '<span class="activity-status-tag ' + act.data.to + '">' + (STATUS_MAP[act.data.to] || act.data.to) + '</span>' +
                    '</div>' +
                    '</div>';
            } else if (act.type === 'comment') {
                html += '<div class="activity-item type-comment">' +
                    '<div class="activity-header">' +
                    '<span class="activity-author">' + escapeHtml(act.author) + '</span>' +
                    '<span class="activity-action">commented</span>' +
                    '<span class="activity-time">' + timeAgo(act.timestamp) + '</span>' +
                    '</div>' +
                    '<div class="activity-body">' + formatCommentText(act.data.text) + '</div>' +
                    '</div>';
            }
        });

        html += '</div>';
        return html;
    }

    // ============================================
    // DETAIL MODAL
    // ============================================
    function openDetailModal(feedbackId) {
        var store = FluxStorage.get('feedback_data', { feedback: [] });
        var item = null;
        for (var i = 0; i < store.feedback.length; i++) {
            if (store.feedback[i].id === feedbackId) { item = store.feedback[i]; break; }
        }
        if (!item) return;

        state.currentDetailId = feedbackId;

        dom.detailTitle.textContent = item.title;
        dom.detailDescription.textContent = item.description;
        dom.detailClient.textContent = item.client || '';
        dom.detailTimestamp.textContent = new Date(item.timestamp).toLocaleString();

        dom.detailStatus.textContent = STATUS_MAP[item.status] || item.status;
        dom.detailStatus.className = 'status-badge ' + item.status;

        dom.detailType.textContent = TYPE_LABELS[item.type] || item.type;
        dom.detailType.className = 'type-tag ' + item.type;

        dom.detailPriority.textContent = PRIORITY_LABELS[item.priority] || item.priority;
        dom.detailPriority.className = 'priority-badge ' + item.priority;

        // RBAC: Status changer only for agency
        if (dom.detailStatusSelect) {
            dom.detailStatusSelect.value = item.status;
        }

        // Files
        if (item.files && item.files.length > 0) {
            dom.detailFilesSection.classList.remove('hidden');
            dom.detailFileList.innerHTML = item.files.map(function (f) {
                var ext = getFileExtension(f.name);
                return '<div class="detail-file-item">' +
                    '<div class="file-type-icon ' + ext + '"><i class="fas ' + (FILE_ICONS[ext] || 'fa-file') + '"></i></div>' +
                    '<div class="file-info"><div class="file-name">' + escapeHtml(f.name) + '</div>' +
                    '<div class="file-size">' + formatFileSize(f.size) + ' · ' + ext.toUpperCase() + '</div></div></div>';
            }).join('');
        } else {
            dom.detailFilesSection.classList.add('hidden');
        }

        // History/Activity Timeline - REPLACED WITH ENHANCED VERSION
        dom.detailHistory.innerHTML = renderActivityTimeline(item);

        // Comments
        renderComments(item);

        dom.modalFeedbackDetail.classList.remove('hidden');
        dom.commentInput.value = '';
    }

    function renderHistory(item) {
        if (!item.history || item.history.length === 0) {
            return '<div class="comment-empty"><i class="fas fa-history"></i>No history</div>';
        }
        return item.history.slice().reverse().map(function (h) {
            return '<div class="history-item"><div class="history-text">' +
                (h.from ? 'Moved from <strong>' + (STATUS_MAP[h.from] || h.from) + '</strong> to <strong>' + (STATUS_MAP[h.to] || h.to) + '</strong>' : 'Created as <strong>' + (STATUS_MAP[h.to] || h.to) + '</strong>') +
                (h.by ? ' by ' + escapeHtml(h.by) : '') +
                '</div><div class="history-time">' + timeAgo(h.timestamp) + '</div></div>';
        }).join('');
    }

    function renderComments(item) {
        if (!item.comments || item.comments.length === 0) {
            dom.commentsThread.innerHTML = '<div class="comment-empty"><i class="fas fa-comments"></i>No comments yet</div>';
            return;
        }
        dom.commentsThread.innerHTML = item.comments.map(function (c) {
            var initials = getInitials(c.author);
            return '<div class="comment-item">' +
                '<div class="comment-avatar ' + c.role + '">' + initials + '</div>' +
                '<div class="comment-bubble">' +
                '<div class="comment-header">' +
                '<span class="comment-author">' + escapeHtml(c.author) + '</span>' +
                '<span class="comment-role ' + c.role + '">' + (c.role === 'client' ? 'Client' : 'Agency') + '</span>' +
                '<span class="comment-time">' + timeAgo(c.timestamp) + '</span>' +
                '</div>' +
                '<div class="comment-text">' + formatCommentText(c.text) + '</div>' +
                '</div></div>';
        }).join('');
        dom.commentsThread.scrollTop = dom.commentsThread.scrollHeight;
    }

    function postComment() {
        var text = dom.commentInput.value.trim();
        if (!text) {
            dom.commentInput.focus();
            dom.commentInput.style.animation = 'fluxShake 0.3s ease';
            setTimeout(function () { dom.commentInput.style.animation = ''; }, 300);
            return;
        }

        // Both roles can comment — API validates authentication
        FluxAPI.createComment(state.currentDetailId, {
            author: session.name,
            role: session.role,
            text: text
        }).then(function (res) {
            if (res.ok) {
                dom.commentInput.value = '';
                var store = FluxStorage.get('feedback_data', { feedback: [] });
                var item = null;
                for (var i = 0; i < store.feedback.length; i++) {
                    if (store.feedback[i].id === state.currentDetailId) { item = store.feedback[i]; break; }
                }
                if (item) {
                    renderComments(item);
                    renderKanbanEnhanced();
                }
                FluxNotifications.push(
                    'Comment on "' + (item ? item.title : '') + '"',
                    'info', 'fa-comment', state.currentDetailId
                );
                FluxToast.show('Comment posted', 'success');
            } else {
                FluxToast.show('Failed: ' + res.error, 'error');
            }
        });
    }

    function formatCommentText(text) {
        var escaped = escapeHtml(text);
        return escaped.replace(/@(\w+)/g, '<span style="color:var(--primary-600);font-weight:600;">@$1</span>');
    }

    // ============================================
    // SUBMIT FEEDBACK — Both roles can submit
    // ============================================
    function openSubmitModal() {
        dom.feedbackForm.reset();
        dom.titleCharCount.textContent = '0';
        state.uploadedFiles = [];
        dom.filePreviewList.innerHTML = '';
        dom.modalSubmitFeedback.classList.remove('hidden');
        dom.feedbackTitle.focus();
    }

    function submitFeedback() {
        var title = dom.feedbackTitle.value.trim();
        var typeRadio = document.querySelector('input[name="feedbackType"]:checked');
        var description = dom.feedbackDescription.value.trim();
        var priority = dom.feedbackPriority.value;

        if (!title) { FluxToast.show('Please enter a title', 'error'); dom.feedbackTitle.focus(); return; }
        if (!typeRadio) { FluxToast.show('Please select a feedback type', 'error'); return; }
        if (!description) { FluxToast.show('Please provide a description', 'error'); dom.feedbackDescription.focus(); return; }

        FluxAPI.createFeedback({
            title: title,
            description: description,
            type: typeRadio.value,
            client: session.org || session.name,
            projectId: FluxAPI.getActiveProject(),
            files: state.uploadedFiles.map(function (f) {
                return { name: f.name, size: f.size, type: getFileExtension(f.name) };
            }),
            priority: priority,
            author: session.name
        }).then(function (res) {
            if (res.ok) {
                state.uploadedFiles = [];
                dom.modalSubmitFeedback.classList.add('hidden');
                renderAll();
                FluxNotifications.push('New feedback: "' + title + '"', 'info', 'fa-comment-dots', res.data.id);
                FluxToast.show('Feedback submitted!', 'success');
            } else {
                FluxToast.show('Failed: ' + res.error, 'error');
            }
        });
    }

    // ============================================
    // FILE HANDLING
    // ============================================
    function handleFileSelect(files) {
        var maxSize = 10 * 1024 * 1024;
        var allowed = ['pdf', 'png', 'jpg', 'jpeg', 'psd', 'ai'];

        Array.from(files).forEach(function (file) {
            var ext = getFileExtension(file.name);
            if (allowed.indexOf(ext) === -1) { FluxToast.show('.' + ext + ' not allowed', 'error'); return; }
            if (file.size > maxSize) { FluxToast.show(file.name + ' exceeds 10MB', 'error'); return; }
            state.uploadedFiles.push(file);
        });
        renderFilePreviewList();
    }

    function renderFilePreviewList() {
        dom.filePreviewList.innerHTML = state.uploadedFiles.map(function (file, idx) {
            var ext = getFileExtension(file.name);
            return '<div class="file-preview-item">' +
                '<div class="file-type-icon ' + ext + '"><i class="fas ' + (FILE_ICONS[ext] || 'fa-file') + '"></i></div>' +
                '<div class="file-info"><div class="file-name">' + escapeHtml(file.name) + '</div>' +
                '<div class="file-size">' + formatFileSize(file.size) + ' · ' + ext.toUpperCase() + '</div></div>' +
                '<button class="file-remove" data-idx="' + idx + '"><i class="fas fa-times"></i></button></div>';
        }).join('');

        $$('.file-remove').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                state.uploadedFiles.splice(parseInt(btn.dataset.idx), 1);
                renderFilePreviewList();
            });
        });
    }

    // ============================================
    // CONVERT TO TASK — AGENCY ONLY
    // ============================================
    function openConvertModal(ids) {
        // RBAC: Only agency can convert
        if (!isAgency) {
            console.warn('[RBAC] Client tried to open convert modal');
            return;
        }

        state.pendingConvertIds = ids;
        var store = FluxStorage.get('feedback_data', { feedback: [] });
        var first = null;
        for (var i = 0; i < store.feedback.length; i++) {
            if (store.feedback[i].id === ids[0]) { first = store.feedback[i]; break; }
        }
        if (first) dom.taskTitle.value = first.title;

        dom.taskAssignee.value = '';
        dom.taskDeadline.value = '';
        dom.taskHours.value = '';
        dom.modalConvertTask.classList.remove('hidden');
        dom.taskTitle.focus();
    }

    function confirmConvertTask() {
        // RBAC: Double-check
        if (!isAgency) {
            FluxToast.show('Permission denied', 'error');
            return;
        }

        var title = dom.taskTitle.value.trim();
        if (!title) { FluxToast.show('Task title required', 'error'); dom.taskTitle.focus(); return; }

        var promises = state.pendingConvertIds.map(function (id) {
            return FluxAPI.updateFeedbackStatus(id, 'approved', session.name);
        });

        Promise.all(promises).then(function (results) {
            var failed = results.filter(function (r) { return !r.ok; });
            if (failed.length > 0) {
                FluxToast.show('Error: ' + failed[0].error, 'error');
            }
            FluxNotifications.push('Task created: "' + title + '"', 'success', 'fa-tasks');
            dom.modalConvertTask.classList.add('hidden');
            state.selectedIds.clear();
            state.pendingConvertIds = [];
            renderAll();
            FluxToast.show('Task created: ' + title, 'success');
        });
    }

    // ============================================
    // STATUS CHANGE FROM DETAIL MODAL — AGENCY ONLY
    // ============================================
    function handleDetailStatusChange() {
        if (!isAgency) {
            FluxToast.show('Permission denied: Cannot change status', 'error');
            return;
        }

        if (!state.currentDetailId || !dom.detailStatusSelect) return;

        var newStatus = dom.detailStatusSelect.value;

        FluxAPI.updateFeedbackStatus(state.currentDetailId, newStatus, session.name).then(function (res) {
            if (res.ok) {
                FluxToast.show('Status updated to ' + STATUS_MAP[newStatus], 'success');
                FluxNotifications.push(
                    'Status changed to ' + STATUS_MAP[newStatus],
                    'warning', 'fa-exchange-alt', state.currentDetailId
                );
                // Update the detail modal
                dom.detailStatus.textContent = STATUS_MAP[newStatus];
                dom.detailStatus.className = 'status-badge ' + newStatus;

                // Re-render history using activity timeline
                var store = FluxStorage.get('feedback_data', { feedback: [] });
                var item = null;
                for (var i = 0; i < store.feedback.length; i++) {
                    if (store.feedback[i].id === state.currentDetailId) { item = store.feedback[i]; break; }
                }
                if (item) dom.detailHistory.innerHTML = renderActivityTimeline(item);

                renderKanbanEnhanced();
                renderMetrics();
            } else {
                FluxToast.show('Failed: ' + res.error, 'error');
                // Revert select
                var store2 = FluxStorage.get('feedback_data', { feedback: [] });
                var item2 = null;
                for (var j = 0; j < store2.feedback.length; j++) {
                    if (store2.feedback[j].id === state.currentDetailId) { item2 = store2.feedback[j]; break; }
                }
                if (item2) dom.detailStatusSelect.value = item2.status;
            }
        });
    }

    // ============================================
    // FILTERS & SEARCH
    // ============================================
    function updateFilterUI() {
        var typesActive = state.activeFilters.types.length < 4;
        var prioritiesActive = state.activeFilters.priorities.length < 4;
        var searchActive = state.searchQuery.trim().length > 0;

        if (dom.filterTypeBtn) dom.filterTypeBtn.classList.toggle('active', typesActive);
        if (dom.filterPriorityBtn) dom.filterPriorityBtn.classList.toggle('active', prioritiesActive);

        if (typesActive || prioritiesActive || searchActive) {
            if (dom.filterReset) dom.filterReset.classList.remove('hidden');
        } else {
            if (dom.filterReset) dom.filterReset.classList.add('hidden');
        }

        if (dom.searchClear) dom.searchClear.classList.toggle('hidden', !searchActive);
    }

    function resetFilters() {
        state.activeFilters.types = ['design', 'technical', 'copy', 'bug'];
        state.activeFilters.priorities = ['urgent', 'high', 'normal', 'low'];
        state.searchQuery = '';
        if (dom.searchInput) dom.searchInput.value = '';
        $$('#filterTypeMenu input[type="checkbox"]').forEach(function (cb) { cb.checked = true; });
        $$('#filterPriorityMenu input[type="checkbox"]').forEach(function (cb) { cb.checked = true; });
        updateFilterUI();
        renderKanbanEnhanced();
        FluxToast.show('Filters reset', 'info');
    }

    // ============================================
    // KEYBOARD SHORTCUTS — RBAC ENFORCED
    // ============================================
    function handleKeyboard(e) {
        var tag = e.target.tagName.toLowerCase();
        var isTyping = (tag === 'input' || tag === 'textarea' || tag === 'select');

        if (e.key === 'Escape') {
            e.preventDefault();
            closeAllModals();
            return;
        }

        if (isTyping) return;

        switch (e.key.toLowerCase()) {
            case 'n':
                e.preventDefault();
                openSubmitModal();
                break;
            case 'f':
                e.preventDefault();
                if (dom.searchInput) dom.searchInput.focus();
                break;
            case '?':
                e.preventDefault();
                if (dom.shortcutsHelp) dom.shortcutsHelp.classList.toggle('hidden');
                break;
            case '1':
                // Both roles can use client view
                e.preventDefault();
                switchView('client');
                break;
            case '2':
                e.preventDefault();
                // RBAC: Only agency can switch to agency view
                if (isAgency) {
                    switchView('agency');
                } else {
                    FluxToast.show('Agency view requires agency permissions', 'warning');
                }
                break;
        }
    }

    function closeAllModals() {
        if (dom.modalSubmitFeedback) dom.modalSubmitFeedback.classList.add('hidden');
        if (dom.modalFeedbackDetail) dom.modalFeedbackDetail.classList.add('hidden');
        if (dom.modalConvertTask) dom.modalConvertTask.classList.add('hidden');
        if (dom.shortcutsHelp) dom.shortcutsHelp.classList.add('hidden');
        state.currentDetailId = null;
    }

    // ============================================
    // UTILITIES
    // ============================================
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function timeAgo(ts) {
        var sec = Math.floor((Date.now() - ts) / 1000);
        if (sec < 60) return 'just now';
        var min = Math.floor(sec / 60);
        if (min < 60) return min + 'm ago';
        var hr = Math.floor(min / 60);
        if (hr < 24) return hr + 'h ago';
        var d = Math.floor(hr / 24);
        if (d < 7) return d + 'd ago';
        return new Date(ts).toLocaleDateString();
    }

    function getFileExtension(name) { return (name || '').split('.').pop().toLowerCase(); }

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    }

    function getInitials(name) {
        return (name || '').split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    function setupEventListeners() {
        // --- View switch ---
        if (dom.clientViewBtn) {
            dom.clientViewBtn.addEventListener('click', function () { switchView('client'); });
        }
        if (dom.agencyViewBtn) {
            dom.agencyViewBtn.addEventListener('click', function () {
                // RBAC: Guard at click level too
                if (!isAgency) {
                    FluxToast.show('Agency view requires agency permissions', 'warning');
                    return;
                }
                switchView('agency');
            });
        }

        // --- Project selector ---
        if (dom.projectSelector) {
            dom.projectSelector.addEventListener('click', function () {
                if (isAgency) {
                    window.location.href = 'projects.html';
                } else {
                    FluxToast.show('Project management requires agency permissions', 'warning');
                }
            });
        }

        // --- FAB / Submit (both roles) ---
        if (dom.fabNewFeedback) dom.fabNewFeedback.addEventListener('click', openSubmitModal);
        if (dom.closeSubmitModal) dom.closeSubmitModal.addEventListener('click', function () { dom.modalSubmitFeedback.classList.add('hidden'); });
        if (dom.cancelSubmitFeedback) dom.cancelSubmitFeedback.addEventListener('click', function () { dom.modalSubmitFeedback.classList.add('hidden'); });
        if (dom.submitFeedback) dom.submitFeedback.addEventListener('click', submitFeedback);

        // Title char count
        if (dom.feedbackTitle) {
            dom.feedbackTitle.addEventListener('input', function () { dom.titleCharCount.textContent = dom.feedbackTitle.value.length; });
        }

        // --- File upload ---
        if (dom.fileUploadArea) {
            dom.fileUploadArea.addEventListener('click', function () { dom.fileInput.click(); });
        }
        if (dom.fileInput) {
            dom.fileInput.addEventListener('change', function (e) { handleFileSelect(e.target.files); dom.fileInput.value = ''; });
        }
        if (dom.fileUploadArea) {
            dom.fileUploadArea.addEventListener('dragover', function (e) { e.preventDefault(); dom.fileUploadArea.classList.add('dragover'); });
            dom.fileUploadArea.addEventListener('dragleave', function () { dom.fileUploadArea.classList.remove('dragover'); });
            dom.fileUploadArea.addEventListener('drop', function (e) { e.preventDefault(); dom.fileUploadArea.classList.remove('dragover'); handleFileSelect(e.dataTransfer.files); });
        }

        // --- Detail modal ---
        if (dom.closeDetailModal) {
            dom.closeDetailModal.addEventListener('click', function () { dom.modalFeedbackDetail.classList.add('hidden'); state.currentDetailId = null; });
        }
        if (dom.postComment) dom.postComment.addEventListener('click', postComment);
        if (dom.commentInput) {
            dom.commentInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); }
            });
        }

        // --- Detail status changer (agency only) ---
        if (dom.detailStatusSelect) {
            dom.detailStatusSelect.addEventListener('change', handleDetailStatusChange);
        }

        // --- Convert task (agency only) ---
        if (dom.closeConvertModal) dom.closeConvertModal.addEventListener('click', function () { dom.modalConvertTask.classList.add('hidden'); });
        if (dom.cancelConvertTask) dom.cancelConvertTask.addEventListener('click', function () { dom.modalConvertTask.classList.add('hidden'); });
        if (dom.confirmConvertTask) dom.confirmConvertTask.addEventListener('click', confirmConvertTask);

        // --- Bulk actions (agency only) ---
        if (dom.bulkApprove) dom.bulkApprove.addEventListener('click', bulkApprove);
        if (dom.bulkConvert) {
            dom.bulkConvert.addEventListener('click', function () {
                if (state.selectedIds.size > 0 && isAgency) openConvertModal(Array.from(state.selectedIds));
            });
        }
        if (dom.bulkDelete) dom.bulkDelete.addEventListener('click', bulkDelete);
        if (dom.bulkDeselect) {
            dom.bulkDeselect.addEventListener('click', function () {
                state.selectedIds.clear();
                $$('.feedback-card.selected').forEach(function (el) { el.classList.remove('selected'); });
                updateBulkBar();
            });
        }

        // --- Search ---
        if (dom.searchInput) {
            dom.searchInput.addEventListener('input', function (e) { state.searchQuery = e.target.value; updateFilterUI(); renderKanbanEnhanced(); });
        }
        if (dom.searchClear) {
            dom.searchClear.addEventListener('click', function () { state.searchQuery = ''; dom.searchInput.value = ''; updateFilterUI(); renderKanbanEnhanced(); });
        }

        // --- Filter dropdowns ---
        if (dom.filterTypeBtn) {
            dom.filterTypeBtn.addEventListener('click', function (e) { e.stopPropagation(); dom.filterTypeMenu.classList.toggle('hidden'); dom.filterPriorityMenu.classList.add('hidden'); });
        }
        if (dom.filterPriorityBtn) {
            dom.filterPriorityBtn.addEventListener('click', function (e) { e.stopPropagation(); dom.filterPriorityMenu.classList.toggle('hidden'); dom.filterTypeMenu.classList.add('hidden'); });
        }

        $$('#filterTypeMenu input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                state.activeFilters.types = Array.from($$('#filterTypeMenu input[type="checkbox"]:checked')).map(function (el) { return el.value; });
                updateFilterUI(); renderKanbanEnhanced();
            });
        });

        $$('#filterPriorityMenu input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                state.activeFilters.priorities = Array.from($$('#filterPriorityMenu input[type="checkbox"]:checked')).map(function (el) { return el.value; });
                updateFilterUI(); renderKanbanEnhanced();
            });
        });

        $$('.filter-action').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var menu = btn.closest('.filter-menu');
                var cbs = menu.querySelectorAll('input[type="checkbox"]');
                cbs.forEach(function (cb) { cb.checked = btn.dataset.action === 'all'; cb.dispatchEvent(new Event('change')); });
            });
        });

        if (dom.filterReset) dom.filterReset.addEventListener('click', resetFilters);

        // --- Close dropdowns on outside click ---
        document.addEventListener('click', function (e) {
            if (!e.target.closest('#filterType') && dom.filterTypeMenu) dom.filterTypeMenu.classList.add('hidden');
            if (!e.target.closest('#filterPriority') && dom.filterPriorityMenu) dom.filterPriorityMenu.classList.add('hidden');
        });

        // --- Close modals on overlay click ---
        [dom.modalSubmitFeedback, dom.modalFeedbackDetail, dom.modalConvertTask].forEach(function (overlay) {
            if (overlay) overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    overlay.classList.add('hidden');
                    if (overlay === dom.modalFeedbackDetail) state.currentDetailId = null;
                }
            });
        });

        // --- Keyboard ---
        document.addEventListener('keydown', handleKeyboard);
    }

    // ============================================
    // BOOT
    // ============================================
    init();
});