import React from "react";
import Helmet from "react-helmet";

import { config } from "config";
import ImageryPane from "../components/ImageryPane";

export default class Index extends React.Component {
  state = {
    sources: {}
  }

  componentDidMount() {
    fetch(`${config.imageryEndpoint}/imagery`)
      .then(rsp => rsp.json())
      .then(sources => {
        this.setState({
          sources
        });
      })
      .catch(err => console.warn(err.stack));
  }

  render() {
    const { sources } = this.state;

    const imagery = Object.keys(sources)
      .filter(name => sources[name] !== {})
      .map((name, idx) => (
        <ImageryPane
          key={idx}
          name={name}
          source={sources[name]}
          endpoint={`${config.imageryEndpoint}/imagery/${name}`}
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
            <h3>Imagery <small>Sources</small></h3>
          </div>
          <div className="title_right">
            <button type="button" className="btn btn-primary btn-sm pull-right">New Source</button>
          </div>
        </div>
        <div className="clearfix" />

        {imagery}
      </div>
    );
  }
}
