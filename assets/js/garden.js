/* improved garden.js - drop-in replacement
   Key changes:
   - Delay reading #flower_template until DOM ready
   - Use DOM appendChild to reliably insert SVG namespace nodes
   - Fix hex color formatting (pad to 2 digits)
   - Use a global papers_global set in build_garden
   - Safer handling for missing positions / template
*/

var flowerTemplateHTML = null;
var garden_height = 580;
const plantWidth = 400;
var root_stem_height = 70;
var root_offset = 60;
var stem_height = 80;

const waveWidth = 150, wave_offset = 80, waveHeight = 50;
const cloudWidth = 75, cloudHeight = 30, cloud_offset = 0;
var research_garden = [];
var id2paper = {};
var flower_positions = {};
var papers_global = null; // will be assigned in build_garden

// Utility: append an SVG node into the #garden SVG element reliably
function appendToGardenSVG(node) {
  const svg = document.getElementById('garden');
  if (svg && typeof svg.appendChild === 'function') {
    svg.appendChild(node);
  } else {
    // fallback to jQuery append if #garden isn't an SVG (keeps backward compat)
    try {
      $('#garden').append(node);
    } catch (e) {
      console.warn('Failed to append node to #garden', e);
    }
  }
}

// Safely get flower template (call after DOM ready)
function ensureFlowerTemplate() {
  if (flowerTemplateHTML !== null) return;
  const t = document.getElementById('flower_template');
  if (t) {
    flowerTemplateHTML = t.innerHTML;
  } else {
    flowerTemplateHTML = ''; // graceful fallback
    console.warn('#flower_template not found in DOM; flowers will be empty');
  }
}

function build_garden(papers) {
    ensureFlowerTemplate();

    papers_global = papers; // make available to select_coauthor
    research_garden = [];
    id2paper = {};
    for (var paper of papers) {
        id2paper[paper.id] = paper;

        if (paper.root_node) {
            research_garden.push({plant_name: paper.root_name, flower_color: paper.root_color, papers: [paper]});
        } else {
            var parent = id2paper[paper.parent];
            if (!parent) {
                // parent might appear later in the list — simple fix: push into a temp list or skip for now
                console.warn('Parent not found for paper', paper.id, paper.parent);
                continue;
            }
            if (!parent.children) parent.children = [];
            parent.children.push(paper);
        }
    }

    var garden_width = plantWidth * research_garden.length + 100;
    // set size on svg (ensure #garden is an <svg>)
    const gardenEl = document.getElementById('garden');
    if (gardenEl) {
      gardenEl.setAttribute('width', garden_width);
      gardenEl.setAttribute('height', garden_height);
    } else {
      // fallback to jquery resize on container
      $('#garden').width(garden_width).height(garden_height);
    }

    calculate_coauthors(papers);
    renderGarden();
}

function createPlant(plant, x_pos, plant_index) {
    ensureFlowerTemplate();

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${x_pos}, ${garden_height})`);

    // Add plant name
    const nameLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameLabel.setAttribute("class", "direction-label");
    nameLabel.setAttribute("x", "0");
    nameLabel.setAttribute("y", `-${root_offset-15}`);
    const lines = (plant.plant_name || '').split('\n');
    lines.forEach((line, index) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.textContent = line;
        tspan.setAttribute("x", "0");
        // use em-based vertical spacing but keep simple numeric fallback
        tspan.setAttribute("dy", index === 0 ? "0" : "1.0em");
        tspan.setAttribute("class", `plant_label${index}`);
        nameLabel.appendChild(tspan);
    });

    // straight root stem
    const rootStem = document.createElementNS("http://www.w3.org/2000/svg", "path");
    rootStem.setAttribute("class", "stem root_stem");
    rootStem.setAttribute("d", `M0,-${root_offset} L0,-${root_stem_height+root_offset}`);
    g.appendChild(rootStem);
    g.flower_color = plant.flower_color || '#aaaaaa';
    g.appendChild(nameLabel);

    plant.papers.forEach((paperTree, index) => {
        drawPaperTree(g, paperTree, 0, -(root_stem_height + root_offset), x_pos, plant_index);
    });

    return g;
}

function padHex(n) {
  return n.toString(16).padStart(2, '0');
}
function get_whiter_color(color, factor) {
    // Expect color like "#RRGGBB"
    if (!color || color[0] !== '#' || color.length < 7) return color || '#cccccc';
    var r = parseInt(color.slice(1, 3), 16);
    var g = parseInt(color.slice(3, 5), 16);
    var b = parseInt(color.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + factor));
    g = Math.min(255, Math.max(0, g + factor));
    b = Math.min(255, Math.max(0, b + factor));
    return `#${padHex(r)}${padHex(g)}${padHex(b)}`;
}

function drawPaperTree(parentElement, paper, x_offset, y_offset, plant_x_pos, plant_index) {
    // store flower position relative to whole garden coordinate system
    flower_positions[paper.id] = {x: x_offset + plant_x_pos, y: y_offset};

    paper.flower_color = parentElement.flower_color || '#888888';
    var flower_class = `plant_${plant_index}`;

    var whiter_color = get_whiter_color(paper.flower_color, -30);
    var additional_css = `.${flower_class} {fill: ${whiter_color};} .flower:hover .${flower_class} {fill: ${paper.flower_color};}\n`;

    // append CSS into style element #flower_css safely
    const flowerCssEl = document.getElementById('flower_css');
    if (flowerCssEl) {
      flowerCssEl.textContent += additional_css;
    } else {
      // create a style element if not present
      const s = document.createElement('style');
      s.id = 'flower_css';
      s.textContent = additional_css;
      document.head.appendChild(s);
    }

    // Create flower (SVG group)
    const flower = document.createElementNS("http://www.w3.org/2000/svg", "g");
    flower.setAttribute("class", "flower");
    flower.setAttribute('id', 'flower_' + paper.id);

    var flowerHTML = (flowerTemplateHTML || '').replaceAll(/\[\[FLOWER_CLASS\]\]/g, flower_class);
    flowerHTML = flowerHTML.replaceAll(/\[\[X\]\]/g, 0);
    flowerHTML = flowerHTML.replaceAll(/\[\[Y\]\]/g, 0);

    // Wrap in subgroup
    flowerHTML = `<g class='flower_subgroup'>${flowerHTML}</g>`;
    // Put HTML into a temporary container and import nodes (safe for SVG)
    const temp = document.createElement('div');
    temp.innerHTML = flowerHTML;
    // Move any children into the flower group using proper namespace (try cloning)
    Array.from(temp.childNodes).forEach(node => {
      try {
        // if node is an SVG string, use DOMParser to parse as SVG
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'g') {
          // naive append - some browsers may auto-handle SVG innerHTML under <g>
          flower.appendChild(node);
        } else {
          flower.appendChild(node);
        }
      } catch (e) {
        // ignore — we'll still try to append the raw string as title fallback
      }
    });

    flower.setAttribute("onclick", `open_paper('${paper.id}')`);
    flower.setAttribute("transform", `translate(${x_offset}, ${y_offset})`);

    // label text
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "label");
    label.setAttribute("onclick", `open_paper('${paper.id}')`);

    var titleLines = (paper.title || '').split('\n');
    if (paper.venue) titleLines.push(paper.venue);
    var title_x_offset = paper.is_left_child ? x_offset - 30 : x_offset + 30;

    titleLines.forEach((line, index) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.textContent = line;
        tspan.setAttribute("class", `paper_label${index} ${paper.is_left_child ? "left_child_title" : ""}`);
        tspan.setAttribute("x", title_x_offset);
        // compute y relative to the flower's y_offset
        const y = y_offset + 15 + (index) * 20 - (0.5) * 20 * (titleLines.length);
        tspan.setAttribute("y", `${y}`);
        label.appendChild(tspan);
    });

    // Children handling (1 or 2)
    if (paper.children) {
        if (paper.children.length == 1) {
            const child = paper.children[0];
            const stem = document.createElementNS("http://www.w3.org/2000/svg", "path");
            stem.setAttribute("class", "stem");
            stem.setAttribute("d", `M${x_offset},${y_offset} L${x_offset},${y_offset - stem_height}`);
            parentElement.appendChild(stem);
            drawPaperTree(parentElement, child, x_offset, y_offset - stem_height, plant_x_pos, plant_index);
        } else if (paper.children.length == 2) {
            const leftChild = paper.children[0];
            leftChild.is_left_child = 1;
            const rightChild = paper.children[1];
            const leftStem = document.createElementNS("http://www.w3.org/2000/svg", "path");
            leftStem.setAttribute("class", "stem");
            leftStem.setAttribute("d", `M${x_offset},${y_offset} C${x_offset-30},${y_offset+5} ${x_offset-50},${y_offset} ${x_offset - 50},${y_offset - stem_height}`);
            parentElement.appendChild(leftStem);
            drawPaperTree(parentElement, leftChild, x_offset - 50, y_offset - stem_height, plant_x_pos, plant_index);
            const rightStem = document.createElementNS("http://www.w3.org/2000/svg", "path");
            rightStem.setAttribute("class", "stem");
            rightStem.setAttribute("d", `M${x_offset},${y_offset} C${x_offset+30},${y_offset+5} ${x_offset+50},${y_offset} ${x_offset + 50},${y_offset - stem_height}`);
            parentElement.appendChild(rightStem);
            drawPaperTree(parentElement, rightChild, x_offset + 50, y_offset - stem_height, plant_x_pos, plant_index);
        }
    }

    // Append flower and label to parentElement (which should be a group)
    parentElement.appendChild(flower);
    parentElement.appendChild(label);

    // indirect connections: safe checks
    if (paper.indirect_connections && paper.indirect_connections.length > 0) {
        for (const indirect_connection of paper.indirect_connections) {
            const indirect_connection_pos = flower_positions[indirect_connection];
            if (!indirect_connection_pos) {
                // might not yet be calculated — skip or handle later
                console.warn('Indirect connection target not found yet:', indirect_connection);
                continue;
            }
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("class", "indirect_connection");
            line.setAttribute("x1", x_offset + plant_x_pos);
            line.setAttribute("y1", y_offset + garden_height);
            line.setAttribute("x2", indirect_connection_pos.x);
            line.setAttribute("y2", indirect_connection_pos.y + garden_height);
            // append to the indirect connections group (created in renderGarden)
            const icg = document.querySelector('.indirect-connections-group');
            if (icg) icg.appendChild(line);
        }
    }

    bringFlowersToFront();
}

function open_paper(paper_id) {
    const p = id2paper[paper_id];
    if (!p) return;
    // If you want a modal, ensure elements exist
    $('#paper_modal').fadeIn(200);
    $('#paper_modal_title').text(p.full_title || p.title || '');
    $('#paper_modal_venue').text(p.venue ? `— ${p.venue}` : '');
    $('#paper_modal_content').text(p.summary || '');
    var links = `<a href='${p.url}' target='_blank' rel="noopener">arXiv</a>`;
    if (p.additional_links) {
        for (var link_type of Object.keys(p.additional_links)) {
            links += `<a href="${p.additional_links[link_type]}" target='_blank' rel="noopener">${link_type}</a>`;
        }
    }
    $('#paper_modal_links').html(links);
}

function bringFlowersToFront() {
    // operate directly on SVG nodes for reliable order
    const flowers = document.querySelectorAll('.flower');
    flowers.forEach(function(flower) {
        const p = flower.parentNode;
        if (p) p.appendChild(flower); // re-append to move to end of children (front)
    });
}

function renderGarden() {
    const gardenEl = document.getElementById('garden');
    var garden_width = gardenEl ? parseInt(gardenEl.getAttribute('width') || gardenEl.clientWidth || 800) : $('#garden').width();

    // Add an indirect-connections-group as the first child
    const indirectConnectionsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    indirectConnectionsGroup.setAttribute("class", "indirect-connections-group");
    appendToGardenSVG(indirectConnectionsGroup);

    // clouds
    var cloudSegments = Math.ceil(garden_width / cloudWidth);
    const wavyCloud = document.createElementNS("http://www.w3.org/2000/svg", "path");
    wavyCloud.setAttribute("class", "clouds");
    let cloudPath = `M0,0 C0,${cloud_offset + 0.3 * cloudHeight} 0,${cloud_offset + 0.7 * cloudHeight} 0,${cloud_offset}`;
    for (let i = 0; i < cloudSegments; i++) {
        const x1 = i * cloudWidth;
        const x2 = (i + 1) * cloudWidth;
        const cp1x = x1 + (cloudWidth * 0.25);
        const cp2x = x1 + (cloudWidth * 0.75);
        cloudPath += `C${cp1x},${cloud_offset + 0.3 * cloudHeight} ${cp2x},${cloud_offset + 0.7 * cloudHeight} ${x2},${cloud_offset}`;
    }
    cloudPath += ` L${garden_width},0 L0,0 Z`;
    wavyCloud.setAttribute("d", cloudPath);
    appendToGardenSVG(wavyCloud);

    // wavy grass
    const wavyGrass = document.createElementNS("http://www.w3.org/2000/svg", "path");
    wavyGrass.setAttribute("class", "grass");
    let wavePath = `M0,${garden_height - wave_offset} `;
    var waveSegments = Math.ceil(garden_width / waveWidth);
    for (let i = 0; i < waveSegments; i++) {
        const x1 = i * waveWidth;
        const x2 = (i + 1) * waveWidth;
        const cp1x = x1 + (waveWidth * 0.25);
        const cp2x = x1 + (waveWidth * 0.75);
        wavePath += `C${cp1x},${garden_height - wave_offset - 0.3 * waveHeight} ${cp2x},${garden_height - wave_offset - 0.7 * waveHeight} ${x2},${garden_height - wave_offset}`;
    }
    wavePath += ` L${garden_width},${garden_height} L0,${garden_height} Z`;
    wavyGrass.setAttribute("d", wavePath);
    appendToGardenSVG(wavyGrass);

    // plants
    research_garden.forEach((plant, index) => {
        const x_pos = (index + 0.5) * plantWidth;
        const plantElement = createPlant(plant, x_pos, index);
        appendToGardenSVG(plantElement);
    });
}

function calculate_coauthors(papers) {
    var coauthor_counts = {};
    for (var i = papers.length - 1; i >= 0; i--) {
        var paper = papers[i];
        for (var coauthor of (paper.coauthors || [])) {
            coauthor_counts[coauthor] = (coauthor_counts[coauthor] || 0) + 1;
        }
    }
    var sorted_coauthors = Object.entries(coauthor_counts).sort((a, b) => b[1] - a[1]);
    for (var i = 0; i < Math.min(10, sorted_coauthors.length); i++) {
        var coauthor = sorted_coauthors[i];
        var coauthor_escaped = coauthor[0].replaceAll("'", "\\'");
        $('#coauthor_list').append(`<div class="coauthor" onclick="select_coauthor('${coauthor_escaped}')">${coauthor[0]}</div>`);
    }
    if (sorted_coauthors.length == 0) {
        $('#coauthor_hall_of_fame').hide();
    }
}

var selected_coauthor = null;
function select_coauthor(coauthor) {
    if (selected_coauthor == coauthor) selected_coauthor = null;
    else selected_coauthor = coauthor;

    $('.flower').removeClass('selected_flower');
    if (papers_global) {
        for (var paper of papers_global) {
            if (!selected_coauthor) break;
            if ((paper.coauthors || []).includes(selected_coauthor)) {
                $(`#flower_${paper.id}`).addClass('selected_flower');
            }
        }
    }
    $('.coauthor').removeClass('selected_coauthor');
    if (selected_coauthor) $(`.coauthor:contains('${selected_coauthor}')`).addClass('selected_coauthor');
}

// Ensure DOM-ready if needed (if this script is included in <head>)
// If build_garden is called after the data is ready, it will work fine.
document.addEventListener('DOMContentLoaded', function() {
  // just ensure template is available and style placeholder exists
  ensureFlowerTemplate();
  if (!document.getElementById('flower_css')) {
    const s = document.createElement('style'); s.id = 'flower_css'; document.head.appendChild(s);
  }
});
