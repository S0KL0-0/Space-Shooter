class Research {
    constructor() {
        this.tabs = [];
        this.nodes = {};
        this.playerResources = window.Points;
        this.selectedTab = null;
        this.selectedNode = null;
        this.currentTransform = { x: 0, y: 0, scale: 1 };
    }

    initializeTabs(researchData) {
        this.tabs = researchData.map((category, index) => ({
            id: `tab-${index}`,
            name: category.name,
            data: category.data
        }));

        // Initialize nodes storage for each tab
        this.tabs.forEach(tab => {
            this.nodes[tab.id] = {};
        });

        this.selectedTab = this.tabs[0].id;
        this.addTabButtons();
        this.drawSvgPanel();
        this.populateAllTabs();
        this.render();
    }

    addNode(id, tab, name, description, cost, position, prerequisites = [], customData = {}, status) {
        const node = {
            id,
            tab,
            name,
            description,
            cost,
            position,
            prerequisites,
            customData,
            status: status ? 'researched' : (cost === 0 ? 'researched' : 'locked')
        };

        this.nodes[tab][id] = node;
        this.updateNodeStatuses();
        return node;
    }

    updateNodeStatuses() {
        Object.keys(this.nodes).forEach(tabId => {
            // First pass: handle auto-unlocked nodes (cost = 0)
            Object.values(this.nodes[tabId]).forEach(node => {
                if (node.cost === 0 && node.status !== 'researched') {
                    node.status = 'researched';
                }
            });

            // Second pass: unlock available nodes
            Object.values(this.nodes[tabId]).forEach(node => {
                if (node.status === 'locked' && node.cost > 0) {
                    const prereqsMet = node.prerequisites.every(prereqId =>
                        this.nodes[tabId][prereqId] && this.nodes[tabId][prereqId].status === 'researched'
                    );

                    if (prereqsMet) {
                        node.status = 'available';
                    }
                }
            });
        });
    }

    canResearchNode(tabId, nodeId) {
        const node = this.nodes[tabId][nodeId];
        if (!node || node.status !== 'available') return false;
        if (this.playerResources < node.cost) return false;

        return node.prerequisites.every(prereqId =>
            this.nodes[tabId][prereqId] && this.nodes[tabId][prereqId].status === 'researched'
        );
    }

    async updatePointsInJson(value) {
        await window.electronAPI.updateJSON('Data/other.json', 'Points', value);
    }

    async updateResearchedNodeInJson(nodeId, value) {
        await window.electronAPI.updateJSON('Data/researched.json', nodeId, value);
    }

    async refreshShipBuilderData() {
        try {
            // Reload the data
            const allData = await load();

            // Update global data
            window.allGameData = allData;
            window.moduleMap = allData.modules;
            window.upgradeMap = allData.upgrades;

            // Update components array
            if (allData && allData.modules && allData.modules instanceof Map) {
                components = [];
                allData.modules.forEach((moduleData, moduleId) => {
                    const component = {
                        name: moduleId,
                        displayName: moduleData.name,
                        maxValue: moduleData.placement_rules?.amount || 0,
                        image: moduleData.image
                    };
                    components.push(component);
                });
            }

            // Count how many of each component are currently placed on the grid
            const placedComponents = {};
            Object.values(shipData).forEach(componentData => {
                const componentType = typeof componentData === 'string' ? componentData : componentData.id;
                placedComponents[componentType] = (placedComponents[componentType] || 0) + 1;
            });

            // Update inventory based on new maxValues and placed components
            components.forEach(comp => {
                if (comp.maxValue > 0) {
                    const placedCount = placedComponents[comp.name] || 0;
                    inventory[comp.name] = Math.max(0, comp.maxValue - placedCount);
                } else {
                    inventory[comp.name] = 0;
                }
            });

            // Refresh the UI
            createSidebarComponents();
            updateInventory();

            console.log('Ship builder data refreshed after research');

        } catch (error) {
            console.error('Failed to refresh ship builder data:', error);
        }
    }

    researchNode(tabId, nodeId) {
        const node = this.nodes[tabId][nodeId];

        if (!this.canResearchNode(tabId, nodeId)) return false;

        this.playerResources -= node.cost;
        node.status = 'researched';

        this.updateNodeStatuses();
        this.render();

        this.updateResearchedNodeInJson(nodeId, 'researched');
        this.updatePointsInJson(this.playerResources);

        this.refreshShipBuilderData();

        return true;
    }

    selectNode(tabId, nodeId) {
        this.selectedNode = this.nodes[tabId][nodeId];
        this.updateInfoPanel();
    }

    addResources(amount) {
        this.playerResources += amount;
        this.updateInfoPanel();
    }

    formatNodeName(id) {
        let name;
        if (id.startsWith("upgrade")) {
            name = window.upgradeMap.get(id)?.name;
        } else {
            name = window.moduleMap.get(id)?.name;
        }
        return name ?? id; // Fallback to id if name is not found
    }


    addTabButtons() {
        const tabButtonsContainer = document.querySelector('.research-tabs-header .tab-buttons');

        if (!tabButtonsContainer) {
            console.error('Tab buttons container not found');
            return;
        }

        tabButtonsContainer.innerHTML = '';

        this.tabs.forEach((tab, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `tab-button ${index === 0 ? 'active' : ''}`;
            tabButton.textContent = tab.name;
            tabButton.addEventListener('click', () => this.switchTab(tab.id));
            tabButtonsContainer.appendChild(tabButton);
        });
    }

    drawSvgPanel() {
        const tabContentsContainer = document.querySelector('.tab-contents');

        if (!tabContentsContainer) {
            console.error('Tab contents container not found');
            return;
        }

        tabContentsContainer.innerHTML = '';

        this.tabs.forEach((tab, index) => {
            const tabContent = document.createElement('div');
            tabContent.className = `tab-content ${index === 0 ? 'active' : ''}`;
            tabContent.id = `tab-content-${tab.id}`;

            if (tab.data.some(item => item.requires)) {
                // Tree view for tabs with dependencies
                tabContent.innerHTML = `
                    <h3>${tab.name}</h3>
                    <div class="tree-container" id="tree-container-${tab.id}">
                        <svg id="research-tree-${tab.id}" viewBox="0 0 1000 800">
                            <defs>
                                <marker id="arrowhead-${tab.id}" markerWidth="10" markerHeight="7"
                                        refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#444444" />
                                </marker>
                                <marker id="arrowhead-active-${tab.id}" markerWidth="10" markerHeight="7"
                                        refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#cc3333" />
                                </marker>
                            </defs>
                            <g id="tier-labels-${tab.id}"></g>
                            <g id="connections-${tab.id}"></g>
                            <g id="nodes-${tab.id}"></g>
                        </svg>
                    </div>
                `;
            } else {
                // List view for simple tabs
                tabContent.innerHTML = `
                    <h3>${tab.name}</h3>
                    <p>Items: ${tab.data.length}</p>
                    <div class="research-items">
                        ${tab.data.map(item => `
                            <div class="research-item">
                                <strong>${this.formatNodeName(item.id)}</strong>
                                <br>Cost: ${item.price}
                                ${item.requires ? `<br>Requires: ${item.requires.map(id => this.formatNodeName(id)).join(', ')}` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            tabContentsContainer.appendChild(tabContent);
        });
    }

    populateAllTabs() {
        this.tabs.forEach(tab => {
            this.populateTabData(tab);
        });
    }

    populateTabData(tab) {
        const positions = this.calculateNodePositions(tab.data);

        tab.data.forEach(item => {
            const nodeId = item.id;
            const nodeName = this.formatNodeName(item.id);
            const nodeDescription = `Research: ${nodeName}`;
            const nodeCost = item.price;
            const nodePosition = positions[nodeId];
            const nodeRequirements = item.requires || [];

            this.addNode(
                nodeId,
                tab.id,
                nodeName,
                nodeDescription,
                nodeCost,
                nodePosition,
                nodeRequirements,
                {},
                item.researched
            );
        });
    }

    calculateNodePositions(data) {
        const positions = {};
        const baseX = 300;
        const baseY = 100;
        const horizontalSpacing = 180;
        const verticalSpacing = 120;

        const nodeMap = {};
        data.forEach(item => {
            nodeMap[item.id] = item;
        });

        const nodesByTier = {};
        data.forEach(item => {
            const tier = this.calculateTier(item, data);
            if (!nodesByTier[tier]) {
                nodesByTier[tier] = [];
            }
            nodesByTier[tier].push(item);
        });

        Object.keys(nodesByTier).sort((a, b) => parseInt(a) - parseInt(b)).forEach(tier => {
            const tierNodes = nodesByTier[tier];
            const tierY = baseY + (parseInt(tier) - 1) * verticalSpacing;

            tierNodes.forEach((node, index) => {
                let nodeX;

                if (node.requires && node.requires.length > 0) {
                    const validParents = node.requires.filter(reqId => nodeMap[reqId] && positions[reqId]);

                    if (validParents.length === 1) {
                        nodeX = positions[validParents[0]].x;
                    } else if (validParents.length > 1) {
                        const parentXPositions = validParents.map(reqId => positions[reqId].x);
                        const minX = Math.min(...parentXPositions);
                        const maxX = Math.max(...parentXPositions);
                        nodeX = (minX + maxX) / 2;
                    } else {
                        const totalNodesInTier = tierNodes.length;
                        const startX = baseX - ((totalNodesInTier - 1) * horizontalSpacing) / 2;
                        nodeX = startX + index * horizontalSpacing;
                    }
                } else {
                    const totalNodesInTier = tierNodes.length;
                    const startX = baseX - ((totalNodesInTier - 1) * horizontalSpacing) / 2;
                    nodeX = startX + index * horizontalSpacing;
                }

                const sameYNodes = Object.values(positions).filter(pos => Math.abs(pos.y - tierY) < 10);
                while (sameYNodes.some(pos => Math.abs(pos.x - nodeX) < 100)) {
                    nodeX += horizontalSpacing / 2;
                }

                positions[node.id] = { x: nodeX, y: tierY };
            });
        });

        return positions;
    }

    calculateTier(item, allData) {
        if (item._tier) return item._tier;

        if (!item.requires || item.requires.length === 0) {
            item._tier = 1;
            return 1;
        }

        let maxRequirementTier = 0;
        item.requires.forEach(reqId => {
            const requiredItem = allData.find(data => data.id === reqId);
            if (requiredItem) {
                const reqTier = this.calculateTier(requiredItem, allData);
                maxRequirementTier = Math.max(maxRequirementTier, reqTier);
            }
        });

        item._tier = maxRequirementTier + 1;
        return item._tier;
    }

    switchTab(tabId) {

        const tabButtons = document.querySelectorAll('.tab-button');
        const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);

        tabButtons.forEach((button, index) => {
            button.classList.toggle('active', index === tabIndex);
        });

        this.tabs.forEach(tab => {
            const tabContent = document.getElementById(`tab-content-${tab.id}`);
            if (tabContent) {
                tabContent.classList.toggle('active', tab.id === tabId);
            }
        });

        this.selectedTab = tabId;
        this.selectedNode = null;
        this.render();
        this.initializePanZoom();
    }

    render() {
        if (!this.selectedTab) return;

        this.drawConnections();
        this.drawNodes();
        this.updateInfoPanel();
    }

    drawConnections() {
        if (!this.selectedTab) return;

        const connectionsGroup = document.getElementById(`connections-${this.selectedTab}`);
        if (!connectionsGroup) return;

        connectionsGroup.innerHTML = '';

        Object.values(this.nodes[this.selectedTab]).forEach(node => {
            node.prerequisites.forEach(prereqId => {
                const prereq = this.nodes[this.selectedTab][prereqId];
                if (prereq) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', prereq.position.x);
                    line.setAttribute('y1', prereq.position.y + 30);
                    line.setAttribute('x2', node.position.x);
                    line.setAttribute('y2', node.position.y - 30);
                    line.classList.add('connection-line');

                    if (prereq.status === 'researched') {
                        line.classList.add('active');
                        line.setAttribute('marker-end', `url(#arrowhead-active-${this.selectedTab})`);
                    } else {
                        line.setAttribute('marker-end', `url(#arrowhead-${this.selectedTab})`);
                    }

                    connectionsGroup.appendChild(line);
                }
            });
        });
    }

    drawNodes() {
        if (!this.selectedTab) return;

        const nodesGroup = document.getElementById(`nodes-${this.selectedTab}`);
        if (!nodesGroup) return;

        nodesGroup.innerHTML = '';

        Object.values(this.nodes[this.selectedTab]).forEach(node => {
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.classList.add('research-node');
            nodeGroup.setAttribute('data-id', node.id);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.position.x);
            circle.setAttribute('cy', node.position.y);
            circle.setAttribute('r', 30);

            if (node.cost === 0) {
                circle.classList.add('node-circle', 'auto-unlocked');
            } else {
                circle.classList.add('node-circle', node.status);
            }

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.position.x);
            text.setAttribute('y', node.position.y);
            text.classList.add('node-text');
            text.textContent = node.name;

            nodeGroup.appendChild(circle);
            nodeGroup.appendChild(text);
            nodesGroup.appendChild(nodeGroup);

            nodeGroup.addEventListener('click', () => this.selectNode(this.selectedTab, node.id));
        });
    }

    updateInfoPanel() {
        const panel = document.getElementById('info-panel');

        if (!this.selectedTab) {
            panel.innerHTML = `
                <div class="info-title">Select a Research Tab</div>
                <div class="info-description">Click on any research tab to view research nodes</div>
                <div class="info-cost">Resources: ${this.playerResources}</div>
            `;
            return;
        }

        if (!this.selectedNode) {
            panel.innerHTML = `
                <div class="info-title">Select a Research Node</div>
                <div class="info-description">Click on any research node to view details</div>
                <div class="info-cost">Resources: ${this.playerResources}</div>
            `;
            return;
        }

        const canResearch = this.canResearchNode(this.selectedTab, this.selectedNode.id);
        let buttonText = 'Locked';

        if (this.selectedNode.status === 'researched') {
            buttonText = this.selectedNode.cost === 0 ? 'Auto-Unlocked' : 'Completed';
        } else if (this.selectedNode.status === 'available' && canResearch) {
            buttonText = 'Research';
        }

        const costText = this.selectedNode.cost === 0 ? 'FREE' : this.selectedNode.cost;

        panel.innerHTML = `
            <div class="info-title">${this.selectedNode.name}</div>
            <div class="info-description">${this.selectedNode.description}</div>
            <div class="info-cost">Cost: ${costText} | Resources: ${this.playerResources}</div>
            <button class="research-button" onclick="researchTree.researchNode('${this.selectedTab}', '${this.selectedNode.id}')" 
                    ${!canResearch || this.selectedNode.status !== 'available' ? 'disabled' : ''}>
                ${buttonText}
            </button>
        `;
    }

    initializePanZoom() {
        if (!this.selectedTab) return;

        let isPanning = false;
        let startPoint = { x: 0, y: 0 };

        const svg = document.getElementById(`research-tree-${this.selectedTab}`);
        if (!svg) return;

        const nodesGroup = document.getElementById(`nodes-${this.selectedTab}`);
        const connectionsGroup = document.getElementById(`connections-${this.selectedTab}`);
        const labelsGroup = document.getElementById(`tier-labels-${this.selectedTab}`);

        // Remove existing listeners
        svg.onmousedown = null;
        svg.onmousemove = null;
        svg.onmouseup = null;
        svg.onmouseleave = null;
        svg.onwheel = null;

        svg.addEventListener('mousedown', (e) => {
            if (e.target === svg) {
                isPanning = true;
                startPoint = { x: e.clientX, y: e.clientY };
            }
        });

        svg.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = e.clientX - startPoint.x;
                const dy = e.clientY - startPoint.y;

                this.currentTransform.x += dx;
                this.currentTransform.y += dy;

                const transform = `translate(${this.currentTransform.x}, ${this.currentTransform.y}) scale(${this.currentTransform.scale})`;
                if (nodesGroup) nodesGroup.setAttribute('transform', transform);
                if (connectionsGroup) connectionsGroup.setAttribute('transform', transform);
                if (labelsGroup) labelsGroup.setAttribute('transform', transform);

                startPoint = { x: e.clientX, y: e.clientY };
            }
        });

        svg.addEventListener('mouseup', () => {
            isPanning = false;
        });

        svg.addEventListener('mouseleave', () => {
            isPanning = false;
        });

        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.currentTransform.scale *= delta;
            this.currentTransform.scale = Math.max(0.5, Math.min(2, this.currentTransform.scale));

            const transform = `translate(${this.currentTransform.x}, ${this.currentTransform.y}) scale(${this.currentTransform.scale})`;
            if (nodesGroup) nodesGroup.setAttribute('transform', transform);
            if (connectionsGroup) connectionsGroup.setAttribute('transform', transform);
            if (labelsGroup) labelsGroup.setAttribute('transform', transform);
        });
    }
}

function loadResearch() {
    // Use the research data that was already loaded and stored in window.allGameData
    if (window.allGameData && window.allGameData.research) {
        return window.allGameData.research;
    } else {
        console.error('Research data not found in window.allGameData');
        return [];
    }
}

async function loadResearchPoints() {
    try {
        // Load points from the JSON file
        const data = await window.electronAPI.loadJSON('Data/other.json');
        return data && typeof data.Points === 'number' ? data.Points : 0;
    } catch (error) {
        console.error('Failed to load research points:', error);
        return 0;
    }
}

async function initializeResearchOverlay() {
    researchData = loadResearch(); // Now uses existing loaded data
    //console.log("research data: ", researchData);

    //console.log('Loaded Research: ', researchData);
    //console.log('Module Map Loaded: ', window.moduleMap);

    const researchButton = document.getElementById('research-button');
    const researchOverlay = document.getElementById('research-overlay');
    const closeResearchButton = document.getElementById('close-research');

    researchButton.addEventListener('click', () => {
        showResearchOverlay();
    });

    closeResearchButton.addEventListener('click', () => {
        hideResearchOverlay();
    });

    researchOverlay.addEventListener('click', (e) => {
        if (e.target === researchOverlay) {
            hideResearchOverlay();
        }
    });

    // Initialize all tabs at once
    if (researchData && researchData.length > 0) {
        researchTree.initializeTabs(researchData);
    }

    window.researchData = researchData;
}

function showResearchOverlay() {
    const overlay = document.getElementById('research-overlay');
    overlay.classList.remove('hidden');
}

function hideResearchOverlay() {
    const overlay = document.getElementById('research-overlay');
    overlay.classList.add('hidden');
}