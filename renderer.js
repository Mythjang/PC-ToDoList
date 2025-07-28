const { ipcRenderer, shell } = require('electron');

class TodoApp {
    constructor() {
        this.todos = [];
        this.settings = {
            backgroundColor: '#ffffff',
            opacity: 0.9,
            fontSize: 14
        };
        this.currentEditingIndex = -1;
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadTodos();
        this.setupEventListeners();
        this.applySettings();
        this.renderTodos();
        await this.updateAutoLaunchStatus();
        this.startReminderCheck();
    }

    setupEventListeners() {
        // 标题栏按钮
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('minimize-window');
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            ipcRenderer.invoke('close-window');
        });

        document.getElementById('pinBtn').addEventListener('click', async () => {
            const isOnTop = await ipcRenderer.invoke('toggle-always-on-top');
            const pinBtn = document.getElementById('pinBtn');
            if (isOnTop) {
                pinBtn.classList.add('pinned');
                pinBtn.title = '取消置顶';
            } else {
                pinBtn.classList.remove('pinned');
                pinBtn.title = '置顶';
            }
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });

        // 设置面板
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('backgroundColorPicker').addEventListener('change', (e) => {
            this.settings.backgroundColor = e.target.value;
            this.applySettings();
            this.saveSettings();
        });

        document.getElementById('opacitySlider').addEventListener('input', (e) => {
            this.settings.opacity = parseFloat(e.target.value);
            document.getElementById('opacityValue').textContent = Math.round(this.settings.opacity * 100) + '%';
            this.applySettings();
            this.saveSettings();
        });

        document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
            this.settings.fontSize = parseInt(e.target.value);
            document.getElementById('fontSizeValue').textContent = this.settings.fontSize + 'px';
            this.applySettings();
            this.saveSettings();
        });

        document.getElementById('autoLaunchCheckbox').addEventListener('change', async (e) => {
            await ipcRenderer.invoke('set-auto-launch', e.target.checked);
        });

        // 添加待办事项
        document.getElementById('addTodoBtn').addEventListener('click', () => {
            this.showTodoDialog();
        });

        // 监听来自对话框的保存事件
        ipcRenderer.on('todo-saved', (event, todoData) => {
            if (todoData._action === 'delete') {
                this.deleteTodo(todoData.id);
            } else {
                this.saveTodoFromDialog(todoData);
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideTodoDialog();
                this.hideSettings();
            }
        });
    }

    async loadSettings() {
        this.settings = await ipcRenderer.invoke('load-settings');
    }

    async saveSettings() {
        await ipcRenderer.invoke('save-settings', this.settings);
    }

    async loadTodos() {
        this.todos = await ipcRenderer.invoke('load-bookmarks');
    }

    async saveTodos() {
        await ipcRenderer.invoke('save-bookmarks', this.todos);
    }

    async updateAutoLaunchStatus() {
        const isEnabled = await ipcRenderer.invoke('get-auto-launch');
        document.getElementById('autoLaunchCheckbox').checked = isEnabled;
    }

    applySettings() {
        const app = document.getElementById('app');
        app.style.background = this.hexToRgba(this.settings.backgroundColor, this.settings.opacity);
        app.style.fontSize = this.settings.fontSize + 'px';

        // 更新设置面板的值
        document.getElementById('backgroundColorPicker').value = this.settings.backgroundColor;
        document.getElementById('opacitySlider').value = this.settings.opacity;
        document.getElementById('opacityValue').textContent = Math.round(this.settings.opacity * 100) + '%';
        document.getElementById('fontSizeSlider').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = this.settings.fontSize + 'px';
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    renderTodos() {
        const container = document.getElementById('todosList');
        
        if (this.todos.length === 0) {
            container.innerHTML = '<div class="empty-state">还没有待办事项，点击下方按钮添加第一个任务吧！</div>';
            return;
        }

        // 按优先级和完成状态排序
        const sortedTodos = [...this.todos].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        container.innerHTML = sortedTodos.map((todo, originalIndex) => {
            const index = this.todos.indexOf(todo);
            const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
            const dueDateText = todo.dueDate ? this.formatDueDate(todo.dueDate) : '';
            
            return `
                <div class="todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority} ${isOverdue ? 'overdue' : ''}" data-index="${index}">
                    <div class="todo-actions">
                        <button class="action-btn edit" onclick="app.editTodo(${index})" title="编辑">✏️</button>
                        <button class="action-btn delete" onclick="app.deleteTodo(${index})" title="删除">🗑️</button>
                    </div>
                    <div class="todo-header">
                        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="app.toggleTodo(${index})">
                        <div class="todo-title">${this.escapeHtml(todo.title)}</div>
                        <span class="todo-priority ${todo.priority}">${this.getPriorityText(todo.priority)}</span>
                    </div>
                    ${todo.description ? `<div class="todo-description">${this.escapeHtml(todo.description)}</div>` : ''}
                    ${dueDateText ? `<div class="todo-due-date ${isOverdue ? 'overdue' : ''}">📅 ${dueDateText}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDueDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return `逾期 ${Math.abs(diffDays)} 天`;
        } else if (diffDays === 0) {
            return '今天到期';
        } else if (diffDays === 1) {
            return '明天到期';
        } else if (diffDays <= 7) {
            return `${diffDays} 天后到期`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    getPriorityText(priority) {
        const priorityMap = {
            high: '高',
            medium: '中',
            low: '低'
        };
        return priorityMap[priority] || '中';
    }

    async toggleTodo(index) {
        this.todos[index].completed = !this.todos[index].completed;
        await this.saveTodos();
        this.renderTodos();
    }

    showSettings() {
        document.getElementById('settingsPanel').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsPanel').classList.add('hidden');
    }

    async showTodoDialog(editIndex = -1) {
        const todo = editIndex >= 0 ? this.todos[editIndex] : null;
        this.currentEditingIndex = editIndex;
        await ipcRenderer.invoke('open-todo-dialog', todo);
    }

    hideTodoDialog() {
        document.getElementById('todoDialog').classList.add('hidden');
        this.currentEditingIndex = -1;
    }

    async saveTodoFromDialog(todoData) {
        if (this.currentEditingIndex >= 0) {
            // 保持原有的完成状态和创建时间
            todoData.completed = this.todos[this.currentEditingIndex].completed;
            todoData.createdAt = this.todos[this.currentEditingIndex].createdAt;
            this.todos[this.currentEditingIndex] = todoData;
        } else {
            this.todos.push(todoData);
        }

        await this.saveTodos();
        this.renderTodos();
        this.currentEditingIndex = -1;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    editTodo(index) {
        this.showTodoDialog(index);
    }

    async deleteTodo(todoId) {
        const index = this.todos.findIndex(t => t.id === todoId);
        if (index !== -1) {
            this.todos.splice(index, 1);
            this.saveTodos();
            this.renderTodos();
        }
    }

    startReminderCheck() {
        // 每分钟检查一次提醒
        setInterval(() => {
            this.checkReminders();
        }, 60000);
        
        // 立即检查一次
        this.checkReminders();
    }

    checkReminders() {
        const now = new Date();
        this.todos.forEach(todo => {
            if (todo.reminder && todo.dueDate && !todo.completed) {
                const dueDate = new Date(todo.dueDate);
                const timeDiff = dueDate - now;
                
                // 提前30分钟提醒
                if (timeDiff > 0 && timeDiff <= 30 * 60 * 1000) {
                    this.showNotification(todo);
                }
            }
        });
    }

    showNotification(todo) {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('待办事项提醒', {
                    body: `${todo.title} 即将到期`,
                    icon: 'assets/icon.png'
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('待办事项提醒', {
                            body: `${todo.title} 即将到期`,
                            icon: 'assets/icon.png'
                        });
                    }
                });
            }
        }
    }
}

// 全局实例
const app = new TodoApp();

// 导出到全局作用域供HTML调用
window.app = app;