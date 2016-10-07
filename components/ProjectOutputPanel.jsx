import React from "react";

import hljs from "highlight.js";

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
    const { endpoint, name } = this.props;
    return (
      <div>
        <h4 className="x_title">Logs</h4>
        <ul className="row list-unstyled">
          <li className="col-xs-4"><a href={`${endpoint}/projects/${name}/logs/stderr`}><code>stderr.log</code></a></li>
          <li className="col-xs-4"><a href={`${endpoint}/projects/${name}/logs/stdout`}><code>stdout.log</code></a></li>
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
                <a href={`${endpoint}/projects/${name}/artifacts/${artifact}`}><code>{artifact}</code></a>
              </li>
            ))
          }
        </ul>
      </div>
    );
  }

  getPreview() {
    const { artifacts, name, endpoint } = this.props;

    if (artifacts.length === 0) {
      return null;
    }

    return (
      <div className="row">
        <div className="col-md-4">
          <div className="thumbnail">
            <img src={`${endpoint}/projects/${name}/artifacts/ortho_thumb.png`} />
            <div className="caption">
              <dl>
                <dt>Bounds</dt>
                <dd>-118, 38, -113, 34</dd>
                <dt>Width × Height</dt>
                <dd>2881 × 4481</dd>
                <dt>Filesize</dt>
                <dd>38729900</dd>
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
