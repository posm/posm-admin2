import React from "react";
import Dropzone from "react-dropzone-component";
import Helmet from "react-helmet";
import "react-dropzone-component/styles/filepicker.css";
import "dropzone/dist/dropzone.css";

import { config } from "config";
import ImageryPane from "../components/ImageryPane";

export default class Index extends React.Component {
  static defaultProps = {
    endpoint: config.imageryEndpoint,
  }

  static propTypes() {
    return {
      endpoint: React.PropTypes.string.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.getSources = this.getSources.bind(this);
    this.saveSource = this.saveSource.bind(this);
    this.updateName = this.updateName.bind(this);
  }

  state = {
    name: "",
    sources: {},
  }

  componentDidMount() {
    this.getSources();
  }

  getSources() {
    const { endpoint } = this.props;

    fetch(`${endpoint}/imagery`)
      .then(rsp => rsp.json())
      .then(sources => {
        this.setState({
          sources
        });
      })
      .catch(err => console.warn(err.stack));
  }

  saveSource(url) {
    const { name } = this.state;

    // reset name
    this.setState({
      name: "",
    });

    if (name !== "") {
      // update metadata
      fetch(url, {
        body: JSON.stringify({
          name,
        }),
        method: "PATCH"
      }).then(this.getSources)
        .catch(err => console.warn(err.stack));
    } else {
      this.getSources();
    }
  }

  updateName(event) {
    this.setState({
      name: event.target.value,
    });
  }

  render() {
    const { endpoint } = this.props;
    const { sources } = this.state;
    const sourceName = this.state.name;

    const imagery = Object.keys(sources)
      .filter(name => sources[name] !== {})
      .map(name => (
        <ImageryPane
          key={name}
          name={name}
          source={sources[name]}
          endpoint={`${endpoint}/imagery/${name}`}
          refreshInterval={config.refreshInterval}
        />
      ));

    return (
      <div>
        <Helmet
          title={config.siteTitle}
        />
        <div className="page-title">
          <div className="title_left">
            {/* TODO refresh */}
            <h3>Imagery <small>Sources</small></h3>
          </div>
        </div>
        <div className="clearfix" />

        <div className="row">
          <div className="x_panel">
            <div className="x_title">
              <h2>New Source</h2>
              <div className="clearfix" />
            </div>

            <div className="x_content">
              <form className="form-horizontal form-label-left">
                <div className="form-group">
                  <input type="text" className="form-control" placeholder="Source Name" value={sourceName} onChange={this.updateName} />
                </div>
                <Dropzone
                  config={{
                    postUrl: "no-url",
                  }}
                  eventHandlers={{
                    init: dropzone => {
                      this.dropzone = dropzone;
                    },
                    success: (file, rsp) => {
                      this.saveSource(rsp.source);

                      this.dropzone.removeFile(file);
                    },
                    processing: () => {
                      this.dropzone.options.url = `${endpoint}/imagery/upload`;
                    },
                  }}
                  djsConfig={{
                    acceptedFiles: "image/tiff",
                    addRemoveLinks: false,
                    method: "PUT",
                  }}
                />
              </form>
            </div>
          </div>
        </div>

        {imagery}
      </div>
    );
  }
}
