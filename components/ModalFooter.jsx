import React from "react";

export default class ModalFooter extends React.Component {
  static propTypes() {
    return {
      children: React.PropTypes.any,
    };
  }

  render() {
    return (
      <div className="modal-footer">
        {this.props.children}
      </div>
    );
  }
}
