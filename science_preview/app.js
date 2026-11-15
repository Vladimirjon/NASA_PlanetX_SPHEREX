const labels = {
  identity: 'Different observations',
  target: 'Same source identified',
  coverage: 'Usable sky coverage',
  alignment: 'Images aligned to the sky',
  quality: 'Pixel quality reviewed',
  uncertainty: 'Uncertainty accounted for',
  spectral_compatibility: 'Spectral response compatible',
  method: 'Measurement method validated',
};

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function drawImage(canvas, pixels, low, high) {
  const height = pixels.length;
  const width = pixels[0].length;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  const span = Math.max(high - low, Number.EPSILON);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = pixels[y][x];
      const normalized = value === null ? 0 : Math.max(0, Math.min(1, (value - low) / span));
      const gray = Math.round(255 * Math.asinh(5 * normalized) / Math.asinh(5));
      const index = (y * width + x) * 4;
      image.data[index] = gray;
      image.data[index + 1] = gray;
      image.data[index + 2] = gray;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function makeFrame(observation, index, low, high, name) {
  const frame = element('article', 'frame');
  const top = element('div', 'frame-top');
  top.append(element('strong', '', `EPOCH ${index + 1}`), element('span', '', observation.midpoint_utc.slice(0, 10)));
  const window = element('div', 'image-window');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${name}: SPHEREx ${observation.collection} observation on ${observation.midpoint_utc.slice(0, 10)}, wavelength about ${observation.wavelength_um.toFixed(4)} micrometers. The source position is not confirmed.`);
  drawImage(canvas, observation.pixels, low, high);
  window.append(canvas);
  const bottom = element('div', 'frame-bottom');
  const metadata = element('span', '', `D3 · ~${observation.wavelength_um.toFixed(4)} µm · ${observation.collection}`);
  const link = element('a', '', 'Original FITS ↗');
  link.href = observation.source_url;
  link.setAttribute('aria-label', `Open original FITS for ${name}, ${observation.midpoint_utc.slice(0, 10)}`);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  bottom.append(metadata, link);
  frame.append(top, window, bottom);
  return frame;
}

function renderCase(item, report) {
  document.getElementById('case-title').textContent = item.name;
  document.getElementById('focus').textContent = item.focus;
  document.getElementById('summary').textContent = item.summary;
  const values = item.observations.flatMap((observation) => observation.pixels.flat().filter((value) => Number.isFinite(value))).sort((a, b) => a - b);
  const low = values[Math.floor((values.length - 1) * 0.01)];
  const high = values[Math.floor((values.length - 1) * 0.99)];
  document.getElementById('image-pair').replaceChildren(...item.observations.map((observation, index) => makeFrame(observation, index, low, high, item.name)));
  document.getElementById('stretch').textContent = `COMMON ASINH DISPLAY · 1st–99th percentile · ${low.toFixed(3)}–${high.toFixed(3)} MJy/sr · native pixels`;

  const checkList = document.getElementById('checks');
  checkList.replaceChildren();
  for (const [name, label] of Object.entries(labels)) {
    const row = element('details', 'check-row');
    const summary = element('summary');
    const status = report.checks[name] || 'unknown';
    const statusText = status === 'pass' ? 'Checked' : status === 'fail' ? 'Incompatible' : status === 'warning' ? 'Warning' : 'Pending';
    summary.append(element('span', '', label), element('span', `check-status ${status}`, statusText));
    const reason = item.checks[name]?.reason || report.identity.reason;
    row.append(summary, element('p', 'check-reason', reason));
    checkList.append(row);
  }
  const spectral = document.getElementById('spectral');
  spectral.replaceChildren(element('h3', '', 'A closer look at wavelength'));
  if (report.spectral_filter.value !== null) {
    spectral.append(element('p', 'readout', `${(report.spectral_filter.value * 100).toFixed(2)}% of bandwidth`));
    const direction = report.spectral_filter.status === 'pass' ? 'below' : 'above';
    const threshold = (item.spectral_prefilter.value * 100).toFixed(2);
    spectral.append(element('p', '', `The preliminary difference is ${direction} the provisional ${threshold}% filter for this Epsilon Indi B brightness example.`));
  } else {
    spectral.append(element('p', 'readout', 'No threshold applied'));
    spectral.append(element('p', '', 'The positions are hypothetical. A threshold from another source cannot validate this pair.'));
  }
  spectral.append(element('p', '', 'A close match alone does not establish that the observations are scientifically comparable.'));
}

async function start() {
  try {
    const responses = await Promise.all([fetch('cases.json'), fetch('reports.json')]);
    if (responses.some((response) => !response.ok)) throw new Error('Data unavailable');
    const [data, reports] = await Promise.all(responses.map((response) => response.json()));
    const buttons = [...document.querySelectorAll('.case-button')];
    function select(id) {
      const selected = data.cases.find((item) => item.id === id);
      if (!selected || !reports[id]) throw new Error('Case unavailable');
      buttons.forEach((button) => {
        const active = button.dataset.case === id;
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
      });
      renderCase(selected, reports[id]);
    }
    buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.case)));
    select('epsilon');
    document.getElementById('loading').hidden = true;
    document.getElementById('content').hidden = false;
  } catch {
    document.getElementById('loading').hidden = true;
    document.getElementById('error').hidden = false;
  }
}

document.getElementById('theme').addEventListener('click', (event) => {
  const light = document.documentElement.dataset.theme !== 'light';
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  event.currentTarget.textContent = light ? 'Dark mode' : 'Light mode';
});
start();
