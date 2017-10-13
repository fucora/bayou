// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import React from 'react';

import EmbeddableComponent from './EmbeddableComponent';
import ReactEmbed from '../ReactEmbed';

export default class Clock extends EmbeddableComponent {
  static get registryName() {
    return 'embeddable-clock';
  }

  constructor(props) {
    super(props);

    this.state = {
      time: this.getTimeString()
    };
  }

  getTimeString() {
    return (new Date(Date.now())).toLocaleTimeString();
  }

  componentDidMount() {
    const self = this;

    this.timer = setInterval(() => {
      const date = self.getTimeString();

      self.setState({ time: date });
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    return (
      <span>{ this.state.time }</span>
    );
  }
}

ReactEmbed.registerComponent(Clock);