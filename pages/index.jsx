import React from "react";
import Helmet from "react-helmet";

import { config } from "config";

export default class Index extends React.Component {
  render() {
    return (
      <div>
        <Helmet
          title={config.siteTitle}
        />
        <div className="row">
          <div className="col-md-12 col-sm-12 col-xs-12">
            <h1>Welcome to POSM Admin!</h1>
          </div>
        </div>
      </div>
    );
  }
}
