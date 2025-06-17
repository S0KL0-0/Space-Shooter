class ResearchTree {
    constructor(containerId, svgId) {
        this.containerId = containerId;
        this.svgId = svgId;
        this.nodes = {};
        this.playerResources = 1000;
        this.selectedNode = null;
        this.currentTransform = { x: 0, y: 0, scale: 1 };

        this.initializePanZoom();
    }

    // Add a new node to the tree
    addNode(id, name, description, cost, position, prerequisites = [], tier = 1, customData = {}) {
        const node = {
            id,
            name,
            description,
            cost,
            position,
            prerequisites,
            tier,
            customData,
            status: cost === 0 ? 'researched' : 'locked'
        };

        this.nodes[id] = node;
        this.updateNodeStatuses();
        return node;
    }

    // Remove a node from the tree
    removeNode(id) {
        if (this.nodes[id]) {
            // Remove dependencies
            Object.values(this.nodes).forEach(node => {
                node.prerequisites = node.prerequisites.filter(prereq => prereq !== id);
            });
            delete this.nodes[id];
            this.updateNodeStatuses();
        }
    }

    // Get a node by ID
    getNode(id) {
        return this.nodes[id];
    }

    // Update node statuses based on prerequisites
    updateNodeStatuses() {
        // First pass: handle auto-unlocked nodes (cost = 0)
        Object.values(this.nodes).forEach(node => {
            if (node.cost === 0 && node.status !== 'researched') {
                node.status = 'researched';
            }
        });

        // Second pass: unlock available nodes
        Object.values(this.nodes).forEach(node => {
            if (node.status === 'locked' && node.cost > 0) {
                const prereqsMet = node.prerequisites.every(prereqId =>
                    this.nodes[prereqId] && this.nodes[prereqId].status === 'researched'
                );

                if (prereqsMet) {
                    node.status = 'available';
                }
            }
        });
    }

    // Check if a node can be researched
    canResearchNode(nodeId) {
        const node = this.nodes[nodeId];
        if (!node || node.status !== 'available') return false;
        if (this.playerResources < node.cost) return false;

        return node.prerequisites.every(prereqId =>
            this.nodes[prereqId] && this.nodes[prereqId].status === 'researched'
        );
    }

    // Research a node
    researchNode(nodeId) {
        const node = this.nodes[nodeId];

        if (!this.canResearchNode(nodeId)) return false;

        this.playerResources -= node.cost;
        node.status = 'researched';

        this.updateNodeStatuses();
        this.render();
        return true;
    }

    // Select a node
    selectNode(nodeId) {
        this.selectedNode = this.nodes[nodeId];
        this.updateInfoPanel();
    }

    // Set player resources
    setResources(amount) {
        this.playerResources = amount;
        this.updateInfoPanel();
    }

    // Add resources
    addResources(amount) {
        this.playerResources += amount;
        this.updateInfoPanel();
    }

    // Render the entire tree
    render() {
        this.drawTierLabels();
        this.drawConnections();
        this.drawNodes();
        this.updateInfoPanel();
    }

    // Draw tier labels
    drawTierLabels() {
        const labelsGroup = document.getElementById('tier-labels');
        labelsGroup.innerHTML = '';

        const tiers = {};
        Object.values(this.nodes).forEach(node => {
            if (!tiers[node.tier]) {
                tiers[node.tier] = [];
            }
            tiers[node.tier].push(node);
        });

        Object.keys(tiers).sort((a, b) => a - b).forEach(tier => {
            const minY = Math.min(...tiers[tier].map(node => node.position.y));

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', 20);
            text.setAttribute('y', minY - 30);
            text.classList.add('tier-label');
            text.textContent = `TIER ${tier}`;
            labelsGroup.appendChild(text);
        });
    }

    // Draw connection lines
    drawConnections() {
        const connectionsGroup = document.getElementById('connections');
        connectionsGroup.innerHTML = '';

        Object.values(this.nodes).forEach(node => {
            node.prerequisites.forEach(prereqId => {
                const prereq = this.nodes[prereqId];
                if (prereq) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', prereq.position.x);
                    line.setAttribute('y1', prereq.position.y + 30);
                    line.setAttribute('x2', node.position.x);
                    line.setAttribute('y2', node.position.y - 30);
                    line.classList.add('connection-line');

                    if (prereq.status === 'researched') {
                        line.classList.add('active');
                        line.setAttribute('marker-end', 'url(#arrowhead-active)');
                    } else {
                        line.setAttribute('marker-end', 'url(#arrowhead)');
                    }

                    connectionsGroup.appendChild(line);
                }
            });
        });
    }

    // Draw nodes
    drawNodes() {
        const nodesGroup = document.getElementById('nodes');
        nodesGroup.innerHTML = '';

        Object.values(this.nodes).forEach(node => {
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.classList.add('research-node');
            nodeGroup.setAttribute('data-id', node.id);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.position.x);
            circle.setAttribute('cy', node.position.y);
            circle.setAttribute('r', 30);

            // Special styling for auto-unlocked nodes
            if (node.cost === 0) {
                circle.classList.add('node-circle', 'auto-unlocked');
            } else {
                circle.classList.add('node-circle', node.status);
            }

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.position.x);
            text.setAttribute('y', node.position.y);
            text.classList.add('node-text');
            text.textContent = node.name.split(' ')[0];

            nodeGroup.appendChild(circle);
            nodeGroup.appendChild(text);
            nodesGroup.appendChild(nodeGroup);

            nodeGroup.addEventListener('click', () => this.selectNode(node.id));
        });
    }

    // Update info panel
    updateInfoPanel() {
        const panel = document.getElementById('info-panel');

        if (!this.selectedNode) {
            panel.innerHTML = `
                        <div class="info-title">Select a Research Node</div>
                        <div class="info-description">Click on any research node to view details</div>
                        <div class="info-cost">Resources: ${this.playerResources}</div>
                    `;
            return;
        }

        const canResearch = this.canResearchNode(this.selectedNode.id);
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
                    <button class="research-button" onclick="currentTree.researchNode('${this.selectedNode.id}')" 
                            ${!canResearch || this.selectedNode.status !== 'available' ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                `;
    }

    // Initialize pan and zoom
    initializePanZoom() {
        let isPanning = false;
        let startPoint = { x: 0, y: 0 };

        const svg = document.getElementById(this.svgId);
        const nodesGroup = document.getElementById('nodes');
        const connectionsGroup = document.getElementById('connections');
        const labelsGroup = document.getElementById('tier-labels');

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
                nodesGroup.setAttribute('transform', transform);
                connectionsGroup.setAttribute('transform', transform);
                labelsGroup.setAttribute('transform', transform);

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
            nodesGroup.setAttribute('transform', transform);
            connectionsGroup.setAttribute('transform', transform);
            labelsGroup.setAttribute('transform', transform);
        });
    }
}