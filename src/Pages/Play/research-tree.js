let researchData;
let researchTree = new ResearchTree('tree-container', 'research-tree');

async function initializeResearchOverlay() {
    researchData = await loadResearch();
    console.log('Loaded Research: ', researchData);

    const researchButton = document.getElementById('research-button');
    const researchOverlay = document.getElementById('research-overlay');
    const closeResearchButton = document.getElementById('close-research');

    // Show research overlay
    researchButton.addEventListener('click', () => {
        showResearchOverlay();
    });

    // Hide research overlay
    closeResearchButton.addEventListener('click', () => {
        hideResearchOverlay();
    });

    // Close overlay when clicking outside content
    researchOverlay.addEventListener('click', (e) => {
        if (e.target === researchOverlay) {
            hideResearchOverlay();
        }
    });

    // Generate research tabs first
    generateResearchTabs();

    // Then populate the first tab with the research tree
    if (researchData && researchData.length > 0) {
        const firstPageData = researchData[0].data;
        populateResearchTree(firstPageData);
    }
}

function populateResearchTree(data) {
    // Set initial resources (you can adjust this value)
    researchTree.setResources(2000);

    // Calculate positions for nodes in a tree-like layout
    const positions = calculateNodePositions(data);

    // Add nodes to the tree
    data.forEach((item, index) => {
        const nodeId = item.id;
        const nodeName = formatNodeName(item.id);
        const nodeDescription = `Research: ${nodeName}`;
        const nodeCost = item.price;
        const nodePosition = positions[nodeId];
        const nodeRequirements = item.requires || [];
        const nodeTier = calculateTier(item, data);

        researchTree.addNode(
            nodeId,
            nodeName,
            nodeDescription,
            nodeCost,
            nodePosition,
            nodeRequirements,
            nodeTier
        );

        // Mark as researched if already researched
        if (item.researched) {
            // Assuming the ResearchTree class has a method to mark nodes as researched
            // You might need to adjust this based on your ResearchTree implementation
        }
    });

    // Render the tree
    researchTree.render();
}

function calculateNodePositions(data) {
    const positions = {};
    const baseX = 300;
    const baseY = 100;
    const horizontalSpacing = 180;
    const verticalSpacing = 120;

    // Create a map for quick lookup
    const nodeMap = {};
    data.forEach(item => {
        nodeMap[item.id] = item;
    });

    // Group nodes by tier
    const nodesByTier = {};
    data.forEach(item => {
        const tier = calculateTier(item, data);
        if (!nodesByTier[tier]) {
            nodesByTier[tier] = [];
        }
        nodesByTier[tier].push(item);
    });

    // Position nodes tier by tier
    Object.keys(nodesByTier).sort((a, b) => parseInt(a) - parseInt(b)).forEach(tier => {
        const tierNodes = nodesByTier[tier];
        const tierY = baseY + (parseInt(tier) - 1) * verticalSpacing;

        tierNodes.forEach((node, index) => {
            let nodeX;

            // If node has parents, position it based on parent positions
            if (node.requires && node.requires.length > 0) {
                const validParents = node.requires.filter(reqId => nodeMap[reqId] && positions[reqId]);

                if (validParents.length === 1) {
                    // Single parent: position directly below
                    nodeX = positions[validParents[0]].x;
                } else if (validParents.length > 1) {
                    // Multiple parents: position between them
                    const parentXPositions = validParents.map(reqId => positions[reqId].x);
                    const minX = Math.min(...parentXPositions);
                    const maxX = Math.max(...parentXPositions);
                    nodeX = (minX + maxX) / 2;
                } else {
                    // No valid parents positioned yet, use tier-based positioning
                    const totalNodesInTier = tierNodes.length;
                    const startX = baseX - ((totalNodesInTier - 1) * horizontalSpacing) / 2;
                    nodeX = startX + index * horizontalSpacing;
                }
            } else {
                // Root node: use tier-based positioning
                const totalNodesInTier = tierNodes.length;
                const startX = baseX - ((totalNodesInTier - 1) * horizontalSpacing) / 2;
                nodeX = startX + index * horizontalSpacing;
            }

            // Check for overlaps and adjust if necessary
            const sameYNodes = Object.values(positions).filter(pos => Math.abs(pos.y - tierY) < 10);
            while (sameYNodes.some(pos => Math.abs(pos.x - nodeX) < 100)) {
                nodeX += horizontalSpacing / 2;
            }

            positions[node.id] = { x: nodeX, y: tierY };
        });
    });

    return positions;
}

function calculateTier(item, allData) {
    // Use memoization to avoid recalculating
    if (item._tier) return item._tier;

    if (!item.requires || item.requires.length === 0) {
        item._tier = 1;
        return 1;
    }

    // Find the maximum tier of all requirements + 1
    let maxRequirementTier = 0;
    item.requires.forEach(reqId => {
        const requiredItem = allData.find(data => data.id === reqId);
        if (requiredItem) {
            const reqTier = calculateTier(requiredItem, allData);
            maxRequirementTier = Math.max(maxRequirementTier, reqTier);
        }
    });

    item._tier = maxRequirementTier + 1;
    return item._tier;
}

function formatNodeName(id) {
    // Convert ID to readable name
    return id.split(/[-_]/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function generateResearchTabs() {
    // Clear existing content in the research overlay
    const tabButtonsContainer = document.querySelector('.research-tabs-header .tab-buttons');
    const tabContentsContainer = document.querySelector('.tab-contents');

    if (!tabButtonsContainer || !tabContentsContainer) {
        console.error('Tab containers not found in DOM');
        return;
    }

    if (!researchData || researchData.length === 0) {
        tabContentsContainer.innerHTML = '<p>No research data available</p>';
        return;
    }

    // Clear existing tabs
    tabButtonsContainer.innerHTML = '';
    tabContentsContainer.innerHTML = '';

    // Generate tabs for each category
    researchData.forEach((category, index) => {
        // Create tab button
        const tabButton = document.createElement('button');
        tabButton.className = `tab-button ${index === 0 ? 'active' : ''}`;
        tabButton.textContent = category.name;
        tabButton.addEventListener('click', () => switchTab(index));
        tabButtonsContainer.appendChild(tabButton);

        // Create tab content
        const tabContent = document.createElement('div');
        tabContent.className = `tab-content ${index === 0 ? 'active' : ''}`;

        // Add the tree container for the first tab
        if (index === 0) {
            tabContent.innerHTML = `
                <h3>${category.name}</h3>
                <div id="tree-container" class="tree-container">
                    <svg id="research-tree" viewBox="0 0 1000 800">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7"
                                    refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#444444" />
                            </marker>
                            <marker id="arrowhead-active" markerWidth="10" markerHeight="7"
                                    refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#00ff41" />
                            </marker>
                        </defs>
                        <g id="tier-labels"></g>
                        <g id="connections"></g>
                        <g id="nodes"></g>
                    </svg>
                </div>
            `;
        } else {
            tabContent.innerHTML = `
                <h3>${category.name}</h3>
                <p>Items: ${category.data.length}</p>
                <div class="research-items">
                    ${category.data.map(item => `
                        <div class="research-item">
                            <strong>${formatNodeName(item.id)}</strong>
                            <br>Cost: ${item.price}
                            ${item.requires ? `<br>Requires: ${item.requires.map(formatNodeName).join(', ')}` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        tabContentsContainer.appendChild(tabContent);
    });
}

function switchTab(activeIndex) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach((button, index) => {
        button.classList.toggle('active', index === activeIndex);
    });

    tabContents.forEach((content, index) => {
        content.classList.toggle('active', index === activeIndex);

        // Re-render tree when switching to first tab
        if (index === activeIndex && index === 0 && researchData) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                // Reinitialize the ResearchTree with the new SVG element
                researchTree = new ResearchTree('tree-container', 'research-tree');
                populateResearchTree(researchData[0].data);
            }, 100);
        }
    });
}

function showResearchOverlay() {
    const overlay = document.getElementById('research-overlay');
    overlay.classList.remove('hidden');
}

function hideResearchOverlay() {
    const overlay = document.getElementById('research-overlay');
    overlay.classList.add('hidden');
}

function handleResearchSelection(itemName) {
    console.log(`Research selected: ${itemName}`);
    hideResearchOverlay();
}

// Make researchTree globally accessible for the research buttons
window.currentTree = researchTree;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initializeResearchOverlay();
});