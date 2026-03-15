/* ================================================
   FLUX — PROJECTS PAGE
   ================================================ */

(function () {
    'use strict';

    // ---- Auth guard ----
    var session = FluxAPI.requireAuth();
    if (!session) return;

    // ---- Init shared modules ----
    FluxNav.init();
    FluxNotifications.init();

    // ---- State ----
    var editingProjectId = null;
    var selectedColor = '1';

    // ---- Seed demo projects if none ----
    _seedProjects();

    // ---- DOM ----
    var grid = document.getElementById('projectsGrid');
    var searchInput = document.getElementById('projectSearch');
    var newProjectBtn = document.getElementById('newProjectBtn');
    var modalOverlay = document.getElementById('projectModalOverlay');
    var modalTitle = document.getElementById('projectModalTitle');
    var modalClose = document.getElementById('projectModalClose');
    var modalCancel = document.getElementById('projectModalCancel');
    var modalSave = document.getElementById('projectModalSave');
    var modalSaveText = document.getElementById('projectModalSaveText');
    var projectNameInput = document.getElementById('projectName');
    var projectClientInput = document.getElementById('projectClient');
    var projectDescInput = document.getElementById('projectDescription');
    var colorPicker = document.getElementById('colorPicker');

    // ---- Initial render ----
    renderProjects();

    // ---- Event Listeners ----
    newProjectBtn.addEventListener('click', function () { openModal(); });
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeModal();
    });

    modalSave.addEventListener('click', saveProject);

    searchInput.addEventListener('input', renderProjects);

    // Color picker
    colorPicker.querySelectorAll('.color-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
            colorPicker.querySelectorAll('.color-option').forEach(function (o) { o.classList.remove('selected'); });
            opt.classList.add('selected');
            selectedColor = opt.dataset.color;
        });
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    // ---- Functions ----
    function renderProjects() {
        FluxAPI.getProjects().then(function (res) {
            var projects = res.data || [];
            var query = searchInput.value.toLowerCase().trim();
            var activeId = FluxAPI.getActiveProject();

            if (query) {
                projects = projects.filter(function (p) {
                    return p.name.toLowerCase().includes(query) ||
                           (p.client || '').toLowerCase().includes(query);
                });
            }

            var html = '';

            projects.forEach(function (p) {
                var isActive = p.id === activeId;
                var feedbackCount = _getFeedbackCount(p.id);

                html += '' +
                    '<div class="project-card ' + (isActive ? 'active-project' : '') + '" data-project-id="' + p.id + '">' +
                    '  <div class="project-card-header">' +
                    '    <div class="project-card-icon color-' + (p.color || '1') + '">' +
                    '      <i class="fas fa-folder"></i>' +
                    '    </div>' +
                    '    <button class="project-card-menu" data-project-id="' + p.id + '" title="Options">' +
                    '      <i class="fas fa-ellipsis-v"></i>' +
                    '    </button>' +
                    '  </div>' +
                    '  <div class="project-card-name">' + _escapeHtml(p.name) + '</div>' +
                    '  <div class="project-card-client"><i class="fas fa-user"></i> ' + _escapeHtml(p.client || 'No client') + '</div>' +
                    '  <div class="project-card-stats">' +
                    '    <div class="project-stat">' +
                    '      <div class="project-stat-value">' + feedbackCount.total + '</div>' +
                    '      <div class="project-stat-label">Feedback</div>' +
                    '    </div>' +
                    '    <div class="project-stat">' +
                    '      <div class="project-stat-value">' + feedbackCount.open + '</div>' +
                    '      <div class="project-stat-label">Open</div>' +
                    '    </div>' +
                    '    <div class="project-stat">' +
                    '      <div class="project-stat-value">' + feedbackCount.approved + '</div>' +
                    '      <div class="project-stat-label">Done</div>' +
                    '    </div>' +
                    '  </div>' +
                    '  <div class="project-card-footer">' +
                    '    <span class="project-card-date">Created ' + _timeAgo(p.createdAt) + '</span>' +
                    (isActive ? '<span class="project-active-badge">Active</span>' : '') +
                    '  </div>' +
                    '</div>';
            });

            // Add "new project" card
            html += '' +
                '<div class="project-card project-card-new" id="newProjectCard">' +
                '  <i class="fas fa-plus-circle"></i>' +
                '  <span>Create New Project</span>' +
                '</div>';

            grid.innerHTML = html;

            // ---- Card interactions ----
            // Click card to activate
            grid.querySelectorAll('.project-card:not(.project-card-new)').forEach(function (card) {
                card.addEventListener('click', function (e) {
                    if (e.target.closest('.project-card-menu')) return;
                    var projectId = card.dataset.projectId;
                    FluxAPI.setActiveProject(projectId);
                    FluxToast.show('Switched to project', 'success');
                    renderProjects();
                });
            });

            // New project card
            var newCard = document.getElementById('newProjectCard');
            if (newCard) {
                newCard.addEventListener('click', function () { openModal(); });
            }

            // Menu buttons
            grid.querySelectorAll('.project-card-menu').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var pid = btn.dataset.projectId;
                    var action = prompt('Action: type "edit" to edit, "delete" to delete');
                    if (action === 'edit') {
                        openModal(pid);
                    } else if (action === 'delete') {
                        if (confirm('Delete this project and all its feedback?')) {
                            FluxAPI.deleteProject(pid).then(function () {
                                // Clear active if it was this project
                                if (FluxAPI.getActiveProject() === pid) {
                                    FluxStorage.remove('active_project');
                                }
                                FluxToast.show('Project deleted', 'error');
                                FluxNotifications.push('Project deleted', 'danger', 'fa-trash');
                                renderProjects();
                            });
                        }
                    }
                });
            });
        });
    }

    function openModal(projectId) {
        editingProjectId = projectId || null;

        if (editingProjectId) {
            modalTitle.textContent = 'Edit Project';
            modalSaveText.textContent = 'Save Changes';

            FluxAPI.getProject(editingProjectId).then(function (res) {
                if (res.ok) {
                    projectNameInput.value = res.data.name;
                    projectClientInput.value = res.data.client || '';
                    projectDescInput.value = res.data.description || '';
                    _selectColor(res.data.color || '1');
                }
            });
        } else {
            modalTitle.textContent = 'New Project';
            modalSaveText.textContent = 'Create Project';
            projectNameInput.value = '';
            projectClientInput.value = '';
            projectDescInput.value = '';
            _selectColor('1');
        }

        modalOverlay.classList.remove('hidden');
        projectNameInput.focus();
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        editingProjectId = null;
    }

    function saveProject() {
        var name = projectNameInput.value.trim();
        if (!name) {
            FluxToast.show('Project name is required', 'error');
            projectNameInput.focus();
            return;
        }

        var data = {
            name: name,
            client: projectClientInput.value.trim(),
            description: projectDescInput.value.trim(),
            color: selectedColor
        };

        if (editingProjectId) {
            FluxAPI.updateProject(editingProjectId, data).then(function (res) {
                if (res.ok) {
                    FluxToast.show('Project updated', 'success');
                    closeModal();
                    renderProjects();
                }
            });
        } else {
            FluxAPI.createProject(data).then(function (res) {
                if (res.ok) {
                    // Auto-activate
                    FluxAPI.setActiveProject(res.data.id);
                    FluxToast.show('Project created!', 'success');
                    FluxNotifications.push('New project created: "' + name + '"', 'success', 'fa-folder-plus');
                    closeModal();
                    renderProjects();
                }
            });
        }
    }

    function _selectColor(c) {
        selectedColor = c;
        colorPicker.querySelectorAll('.color-option').forEach(function (opt) {
            opt.classList.toggle('selected', opt.dataset.color === c);
        });
    }

    function _getFeedbackCount(projectId) {
        var store = FluxStorage.get('feedback_data', { feedback: [] });
        var items = store.feedback.filter(function (f) { return f.projectId === projectId; });
        return {
            total: items.length,
            open: items.filter(function (f) { return f.status !== 'approved'; }).length,
            approved: items.filter(function (f) { return f.status === 'approved'; }).length
        };
    }

    function _seedProjects() {
        var projects = FluxStorage.get('projects', []);
        if (projects.length === 0) {
            projects = [
                {
                    id: 'proj_demo_1',
                    name: 'Website Redesign',
                    client: 'TechCo',
                    description: 'Complete redesign of the TechCo corporate website.',
                    color: '1',
                    createdAt: Date.now() - 86400000 * 7,
                    updatedAt: Date.now()
                },
                {
                    id: 'proj_demo_2',
                    name: 'Brand Identity',
                    client: 'StartupX',
                    description: 'New brand identity including logo, colors, and guidelines.',
                    color: '2',
                    createdAt: Date.now() - 86400000 * 14,
                    updatedAt: Date.now() - 86400000 * 2
                }
            ];
            FluxStorage.set('projects', projects);
            FluxStorage.set('active_project', 'proj_demo_1');

            // Migrate existing demo feedback to the first project
            var feedbackStore = FluxStorage.get('feedback_data', { feedback: [], nextId: 1 });
            feedbackStore.feedback.forEach(function (f) {
                if (!f.projectId) f.projectId = 'proj_demo_1';
            });
            FluxStorage.set('feedback_data', feedbackStore);
        }
    }

    function _timeAgo(timestamp) {
        var seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm ago';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.floor(hours / 24);
        if (days < 30) return days + 'd ago';
        return new Date(timestamp).toLocaleDateString();
    }

    function _escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }
      if (typeof FluxSplash !== 'undefined') {
        FluxSplash.hide();
    }
})();