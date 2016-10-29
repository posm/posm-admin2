import React from "react";

import hljs from "highlight.js";
import prettyBytes from "pretty-bytes";

const highlight = (str, lang) => {
  if (lang != null && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(lang, str).value;
    } catch (err) {
      console.error(err.stack);
    }
  }

  try {
    return hljs.highlightAuto(str).value;
  } catch (err) {
    console.error(err.stack);
  }

  return "";
};

export default class ProjectSourcesPanel extends React.Component {
  static propTypes() {
    return {
      active: React.PropTypes.bool.isRequired,
      artifacts: React.PropTypes.array.isRequired,
      endpoint: React.PropTypes.string.isRequired,
      name: React.PropTypes.string.isRequired,
      project: React.PropTypes.object.isRequired,
    };
  }

  getAPIOutput() {
    const { project } = this.props;

    return (
      <div>
        <h4 className="x_title">API Output</h4>
        <pre dangerouslySetInnerHTML={{ __html: highlight(JSON.stringify(project, null, 2), "json") }} />
      </div>
    );
  }

  getLogs() {
    const { endpoint } = this.props;
    return (
      <div>
        <h4 className="x_title">Logs</h4>
        <ul className="row list-unstyled">
          <li className="col-xs-4"><a href={`${endpoint}/logs/stderr`}><code>stderr.log</code></a></li>
          <li className="col-xs-4"><a href={`${endpoint}/logs/stdout`}><code>stdout.log</code></a></li>
        </ul>
      </div>
    );
  }

  getOutputs() {
    const { artifacts, endpoint } = this.props;

    if (artifacts.length === 0) {
      return null;
    }

    return (
      <div>
        <h4 className="x_title">Outputs</h4>
        <ul className="row list-unstyled">
          {
            artifacts.map((artifact, col) => (
              <li className="col-xs-4" key={col}>
                <a href={`${endpoint}/artifacts/${artifact}`}><code>{artifact}</code></a>
              </li>
            ))
          }
        </ul>
      </div>
    );
  }

  getPreview() {
    const { endpoint, project } = this.props;

    if (project.meta == null) {
      return null;
    }

    const { crs_wkt, height, width } = project.meta;
    let { bounds, resolution, size } = project.meta;

    const projName = crs_wkt.split(/"/)[1];
    const epsgCode = crs_wkt
      .split(/\[/)
      .pop()
      .split(/,/)
      .pop()
      .replace(/[^\d]/g, "");

    bounds = bounds.map(x => x.toFixed(5)).join(", ");
    resolution = resolution.map(x => `${x.toFixed(2)} m`).join(" × ");
    size = prettyBytes(size);

    return (
      <div className="row">
        <div className="col-md-4">
          <div className="thumbnail">
            <a href={`${endpoint}/artifacts/odm_orthophoto.tif`}><img src={`${endpoint}/artifacts/ortho_thumb.png`} /></a>
            <div className="caption">
              <dl>
                <dt>Bounds</dt>
                <dd>{bounds}</dd>
                <dt>Resolution</dt>
                <dd>{resolution}</dd>
                <dt>Width × Height</dt>
                <dd>{width} × {height}</dd>
                <dt>Filesize</dt>
                <dd>{size}</dd>
                <dt>Coordinate Reference System</dt>
                <dd>{projName} (EPSG:{epsgCode})</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div id={`${name}-map`}>
            <h3 style={{ minHeight: "400px", width: "100%", background: "#eee" }}>MAP</h3>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { active, name } = this.props;

    // TODO extract these into components
    const preview = this.getPreview();
    const outputs = this.getOutputs();
    const logs = this.getLogs();
    const apiOutput = this.getAPIOutput();

    return (
      <div role="tabpanel" className={active ? "tab-pane fade active in" : "tab-pane fade"} id={`${name}_artifacts`} aria-labelledby={`${name}-artifacts-tab`}>

        { preview }

        { outputs }

        { logs }

        { apiOutput }
      </div>
    );
  }
}
