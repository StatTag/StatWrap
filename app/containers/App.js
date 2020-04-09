// @flow
import * as React from 'react';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

type Props = {
  children: React.Node
};

export default class App extends React.Component<Props> {
  props: Props;

  render() {
    const { children } = this.props;
    const theme = createMuiTheme({
      palette: {
        type: 'light'
      }
    });
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
  }
}
