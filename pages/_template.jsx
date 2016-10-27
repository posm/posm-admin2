import React from "react";
import { Link } from "react-router";
import { prefixLink } from "gatsby-helpers";

import "../css/app.scss";
import "../css/markdown-styles.css";
import posmLogo from "../images/posm_logo-primary.png";
import posmLogoRetina from "../images/posm_logo-primary@2x.png";

export default class Template extends React.Component {
  static propTypes() {
    return {
      children: React.PropTypes.any,
      location: React.object.isRequired,
    };
  }

  componentDidMount() {
    // these need to be required in a browser context
    require("bootstrap-sass");
    require("fastclick");
  }

  render() {
    return (
      <div className="main_container">
        <div className="col-md-3 left_col">
          <div className="left_col scroll-view">
            <div className="navbar nav_title" style={{ border: 0 }}>
              <Link to={prefixLink("/")} className="site_title">
                <img src={prefixLink(posmLogo)} srcSet={`${prefixLink(posmLogoRetina)} 2x`} />
              </Link>
            </div>

            <div className="clearfix" />

            {/* sidebar menu */}
            <div id="sidebar-menu" className="main_menu_side hidden-print main_menu">
              <div className="menu_section">
                <h3>General</h3>
                <ul className="nav side-menu">
                  <li><Link to={prefixLink("/")}><i className="fa fa-home" /> Home</Link></li>
                </ul>
              </div>
              <div className="menu_section">
                <h3>Tasks</h3>
                <ul className="nav side-menu">
                  <li className={this.props.location.pathname === "/opendronemap/" && "current-page"}>
                    <Link to={prefixLink("/opendronemap/")}><i className="fa fa-paper-plane-o" /> OpenDroneMap</Link>
                  </li>
                  <li className={this.props.location.pathname === "/imagery/" && "current-page"}>
                    <Link to={prefixLink("/imagery/")}><i className="fa fa-cubes" /> Imagery</Link></li>
                </ul>
              </div>

            </div>
            {/* /sidebar menu */}
          </div>
        </div>

        {/* top navigation */}
        <div className="top_nav">
          <div className="nav_menu">
            <nav className="" role="navigation">
              <div className="nav toggle">
                <a id="menu_toggle"><i className="fa fa-bars" /></a>
              </div>
            </nav>
          </div>
        </div>
        {/* /top navigation */}

        {/* page content */}
        <div className="right_col" role="main">
          {this.props.children}
        </div>
        {/* /page content */}
      </div>
    );
  }
}
