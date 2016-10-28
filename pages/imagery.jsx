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
  }

  state = {
    sources: {},
  }

  componentDidMount() {
    this.getSources();
  }

  getSources(callback = () => {}) {
    const { endpoint } = this.props;

    fetch(`${endpoint}/imagery`)
      .then(rsp => rsp.json())
      .then(sources => {
        this.setState({
          sources
        });

        callback(sources);
      })
      .catch(err => console.warn(err.stack));
  }

  updateName(event) {
    this.setState({
      name: event.target.value,
    });
  }

  render() {
    const { endpoint } = this.props;
    const { sources } = this.state;

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
            <div className="x_content">
              <Dropzone
                config={{
                  postUrl: `${endpoint}/imagery/upload`,
                }}
                eventHandlers={{
                  init: dropzone => {
                    this.dropzone = dropzone;
                  },
                  success: (file, rsp) => {
                    this.getSources(() => {
                      this.dropzone.removeFile(file);
                    });
                  },
                }}
                djsConfig={{
                  acceptedFiles: "image/tiff",
                  addRemoveLinks: false,
                  method: "PUT",
                }}
              />
            </div>
          </div>
        </div>

        {imagery}
      </div>
    );
  }
}
