import type { GuidedPairMeasurement } from '../../series/core/guided-pair';
import type { Series } from '../../series/ports/series-source';

export function GuidedPairSummary({ measurement }: { readonly measurement: GuidedPairMeasurement }) {
  return (
    <div className="guided-pair-summary">
      <span className="badge" data-level="OBSERVED">Observed · motion candidate</span>
      <p>
        Across these two SPHEREx images, the measured center of light shifted by about{' '}
        <strong>{measurement.separation_arcsec.toFixed(2)} arcseconds</strong> after correcting for
        parallax, the apparent shift caused by Earth’s changing viewpoint. Nearby sources can affect
        that measurement, so the result remains a motion candidate. Look near the center of the images.
      </p>
    </div>
  );
}

export function GuidedPairEvidence({ series, measurement }: {
  readonly series: Series;
  readonly measurement: GuidedPairMeasurement;
}) {
  return (
    <>
      <h3>Detector D3 · two observations</h3>
      <p className="muted">NASA/IPAC Infrared Science Archive · SPHEREx</p>
      <ul className="check-list guided-pair-observations">
        {series.frames.map((frame, i) => (
          <li key={frame.obs_id}>
            <a href={frame.provenance.source_url} target="_blank" rel="noreferrer">
              Image {i === 0 ? 'A' : 'B'} · {frame.t_mid.slice(0, 10)} UTC
            </a>
            <div className="mono">
              {frame.provenance.collection?.replace(/^spherex_/, '').toUpperCase()} · D3 · {frame.wavelength_um.toFixed(6)} µm
            </div>
          </li>
        ))}
      </ul>
      <details>
        <summary>Inspect pair evidence</summary>
        <p>
          Model-based uncertainty on the displacement is ±{measurement.sigma_delta_arcsec[0].toFixed(2)}″ east–west
          and ±{measurement.sigma_delta_arcsec[1].toFixed(2)}″ north–south, assuming independent errors between dates.
        </p>
        <p>
          Displacement components: {Math.abs(measurement.delta_arcsec[0]).toFixed(2)}″ {measurement.delta_arcsec[0] < 0 ? 'west' : 'east'} and{' '}
          {Math.abs(measurement.delta_arcsec[1]).toFixed(2)}″ {measurement.delta_arcsec[1] < 0 ? 'south' : 'north'}
          {' · '}{(measurement.separation_arcsec / series.grid.pixel_scale_arcsec).toFixed(2)} display pixels at the grid scale.
        </p>
        <p>
          The center of light was measured in the original detector pixels. The viewer uses a common
          grid for both images. Pixel flags were checked at the measured positions. Reference stars and
          possible blending were investigated, and uncertainty remains.
        </p>
        <p>
          Display: {series.grid.pixel_scale_arcsec.toFixed(2)}″ per pixel; asinh stretch; values in {series.frames[0].unit}.
        </p>
        <ul className="check-list">
          {series.comparability.checks.map(check => (
            <li key={check.name}>{check.detail}</li>
          ))}
        </ul>
        <ul className="check-list">
          {series.frames.map(frame => (
            <li key={frame.obs_id}>
              <div className="mono">{frame.obs_id}</div>
              <div>UTC {frame.t_mid} · Bandwidth {frame.bandwidth_um === undefined ? 'unavailable' : `${frame.bandwidth_um.toFixed(6)} µm`}</div>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
