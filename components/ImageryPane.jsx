import React from "react";
import Button from "react-bootstrap/lib/Button";
import Col from "react-bootstrap/lib/Col";
import ControlLabel from "react-bootstrap/lib/ControlLabel";
import Form from "react-bootstrap/lib/Form";
import FormControl from "react-bootstrap/lib/FormControl";
import FormGroup from "react-bootstrap/lib/FormGroup";

import highlight from "../utils/highlight";
import Map from "./Map";

export default class ImageryPane extends React.Component {
  static defaultProps = {
    refreshInterval: 10000
  }

  static propTypes() {
    return {
      endpoint: React.PropTypes.string.isRequired,
      name: React.PropTypes.string.isRequired,
      refreshInterval: React.PropTypes.integer,
      source: React.PropTypes.object.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.cancel = this.cancel.bind(this);
    this.makeMBTiles = this.makeMBTiles.bind(this);
    this.toggle = this.toggle.bind(this);
    this.editName = this.editName.bind(this);
    this.updateSourceName = this.updateSourceName.bind(this);
    this.saveSource = this.saveSource.bind(this);
  }

  state = {
    editing: false,
    pending: [],
    shown: false,
    showSpinner: ["PENDING", "RUNNING"].indexOf(this.props.source.meta.status.ingest.state) >= 0,
    source: this.props.source,
    sourceName: this.props.source.meta.user.name || this.props.name,
  }

  componentDidMount() {
    this.monitor();
  }

  componentWillUpdate(nextProps, nextState) {
    const nextIngestionStatus = nextState.source.meta.status.ingest;
    const ingestionStatus = this.state.source.meta.status.ingest;
    const nextTilingStatus = nextState.source.meta.status.mbtiles;
    const tilingStatus = this.state.source.meta.status.mbtiles;

    if (["SUCCESS", "FAILURE"].indexOf(nextIngestionStatus.state) >= 0 &&
        nextIngestionStatus.state !== ingestionStatus.state) {
      this.setState({
        showSpinner: false,
      });
    }

    if (["SUCCESS", "FAILURE"].indexOf(nextTilingStatus.state) >= 0 &&
        nextTilingStatus.state !== tilingStatus.state) {
      this.setState({
        showSpinner: false,
      });
    }

    // clear pending states; we're all caught up
    if (nextState.source !== this.state.source) {
      this.setState({
        pending: [],
      });
    }
  }

  componentWillUnmount() {
    this.stopMonitoring();
  }

  getButtons() {
    const { endpoint } = this.props;
    const { pending, source } = this.state;
    const { status } = source.meta;

    if (this.isIngesting()) {
      return (
        <button type="button" className="btn btn-dark btn-sm">Ingesting <i className="fa fa-circle-o-notch fa-spin" /></button>
      );
    }

    if (this.isTiling()) {
      if (pending.indexOf("cancelling") >= 0) {
        return (
          <button type="button" className="btn btn-warning btn-sm">Cancelling <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      return (
        <button type="button" className="btn btn-warning btn-sm" onClick={this.cancel}>Cancel</button>
      );
    }

    switch (status.ingest.state) {
    case "SUCCESS": {
      if (pending.indexOf("processing") >= 0) {
        return (
          <button type="button" className="btn btn-primary btn-sm">Processing <i className="fa fa-circle-o-notch fa-spin" /></button>
        );
      }

      if (status.mbtiles.state !== "SUCCESS") {
        return (
          <button type="button" className="btn btn-success btn-sm" onClick={this.makeMBTiles}>Make MBTiles</button>
        );
      }

      return (
        <a href={`${endpoint}/mbtiles`} role="button" className="btn btn-success btn-sm">Download MBTiles</a>
      );
    }

    default: {
      return (
        <button type="button" className="btn btn-danger btn-sm">Failed</button>
      );
    }
    }
  }

  getFailure() {
    const { status } = this.state.source.meta;

    if (status.ingest.state !== "FAILURE" &&
        status.mbtiles.state !== "FAILURE") {
      return null;
    }

    return (
      <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-exclamation-triangle red" /></a>
    );
  }

  getMap() {
    if (!this.state.shown || !this.isReady()) {
      return null;
    }
    // TODO make GDAL XML available for download

    const { endpoint, name } = this.props;
    const { source } = this.state;
    const { maxzoom, minzoom } = source;

    const bounds = [source.bounds.slice(0, 2).reverse(), source.bounds.slice(2, 4).reverse()];
    const url = source.tiles[0];
    const josm = `tms[22]:${url.replace(/{z}/, "{zoom}")}`;

    return (
      <div className="x_content">
        <div className="row">
          <Form horizontal>
            <FormGroup controlId={`${name}-url`}>
              <Col componentClass={ControlLabel} sm={2}>
                URL:
              </Col>
              <Col sm={10}>
                <FormControl type="text" value={url} readOnly />
              </Col>
            </FormGroup>
            <FormGroup controlId={`${name}-tilejson`}>
              <Col componentClass={ControlLabel} sm={2}>
                TileJSON:
              </Col>
              <Col sm={10}>
                <FormControl type="text" value={endpoint} readOnly />
              </Col>
            </FormGroup>
            <FormGroup controlId={`${name}-josm`}>
              <Col componentClass={ControlLabel} sm={2}>
                JOSM Imagery URL:
              </Col>
              <Col sm={10}>
                <FormControl type="text" value={josm} readOnly />
              </Col>
            </FormGroup>
          </Form>
        </div>
        <Map
          bounds={bounds}
          maxzoom={maxzoom}
          minzoom={minzoom}
          url={url}
        />
      </div>
    );
  }

  getSpinner() {
    if (this.shouldShowSpinner()) {
      const { name } = this.state.source;

      return (
        <a data-toggle="modal" data-target={`.${name}-status-modal`}> <i className="fa fa-circle-o-notch fa-spin blue" /></a>
      );
    }

    return null;
  }

  getSource() {
    const { endpoint } = this.props;

    fetch(endpoint)
      .then(rsp => {
        if (!rsp.ok) {
          console.log("bad response");
        }

        return rsp.json();
      })
      .then(source => {
        this.setState({
          source,
        });
      })
      .catch(err => {
        console.warn(err.stack);
      });
  }

  shouldShowSpinner() {
    return this.state.showSpinner;
  }

  cancel() {
    let { pending } = this.state;

    if (pending.indexOf("cancelling") >= 0) {
      throw new Error("Already cancelling.");
    }

    pending.push("cancelling");

    this.setState({
      pending,
    });

    const { endpoint } = this.props;

    fetch(`${endpoint}/mbtiles`, {
      method: "DELETE",
    }).then(rsp => {
      console.log("rsp:", rsp);

      pending = this.state.pending;
      pending.splice(pending.indexOf("cancelling"), 1);

      this.setState({
        pending,
      });

      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  monitor() {
    const { refreshInterval } = this.props;

    this.statusChecker = setInterval(() => this.getSource(), refreshInterval);
  }

  stopMonitoring() {
    clearInterval(this.statusChecker);
  }

  makeMBTiles() {
    const { pending } = this.state;

    if (pending.indexOf("processing") >= 0) {
      throw new Error("Already processing.");
    }

    pending.push("processing");

    this.setState({
      pending,
      showSpinner: true,
    });

    const { endpoint } = this.props;

    fetch(`${endpoint}/mbtiles`, {
      method: "POST",
    }).then(rsp => {
      if (rsp.status >= 400) {
        // TODO display the underlying error message
        throw new Error("Failed.");
      }
    }).catch(err => {
      console.warn(err.stack);
    });
  }

  isReady() {
    const { ingest } = this.state.source.meta.status;

    return ingest.state === "SUCCESS";
  }

  isIngesting() {
    const { ingest } = this.state.source.meta.status;

    return ["PENDING", "RUNNING"].indexOf(ingest.state) >= 0;
  }

  isTiling() {
    const { mbtiles } = this.state.source.meta.status;

    return ["PENDING", "RUNNING"].indexOf(mbtiles.state) >= 0;
  }

  isRunning() {
    return this.isIngesting() || this.isTiling();
  }

  toggle() {
    this.setState({
      shown: !this.state.shown,
    });
  }

  updateMetadata(body) {
    const { endpoint } = this.props;

    // update metadata
    fetch(endpoint, {
      body: JSON.stringify(body),
      method: "PATCH"
    }).then(rsp => this.getSource())
      .catch(err => console.warn(err.stack));
  }

  editName() {
    this.setState({
      editing: true,
    });
  }

  updateSourceName(evt) {
    this.setState({
      sourceName: evt.target.value,
    });
  }

  saveSource(evt) {
    evt.preventDefault();

    this.updateMetadata({
      name: this.state.sourceName,
    });

    this.setState({
      editing: false,
    });
  }

  render() {
    const { editing, shown, source, sourceName } = this.state;
    const { name } = source;

    // TODO delete button
    const buttons = this.getButtons();
    const failure = this.getFailure();
    const spinner = this.getSpinner();
    const map = this.getMap();

    return (
      <div className="row">
        <div className="x_panel">
          <Form inline onSubmit={this.saveSource}>
            <div className="x_title">
              <h2>
                <a tabIndex="-1" onClick={this.toggle}><i className={shown ? "fa fa-chevron-down" : "fa fa-chevron-right"} />&nbsp;</a>
                {editing ?
                  (
                    <span>
                      <input type="text" placeholder={name} value={sourceName} onChange={this.updateSourceName} />
                      <Button type="submit" bsStyle="link"><i className="fa fa-check" /></Button>
                    </span>
                  ) : (
                    <span>
                      <a
                        tabIndex="-1"
                        onClick={this.toggle}
                      >{sourceName}</a> <a tabIndex="-1" role="button" onClick={this.editName}><i className="fa fa-pencil" /></a>
                    </span>
                  )
                }
                {failure} {spinner}
              </h2>

              <div className="pull-right">
                {buttons}
              </div>
              <div className="clearfix" />
            </div>

            <div className={`modal fade ${name}-status-modal`} tabIndex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
              <div className="modal-dialog modal-md" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
                    <h4 className="modal-title" id="mySmallModalLabel">{name} Status</h4>
                  </div>
                  <div className="modal-body">
                    <pre
                      dangerouslySetInnerHTML={{ __html: highlight(JSON.stringify({
                        source,
                      }, null, 2), "json") }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Form>

          {map}
        </div>
      </div>
    );
  }
}
