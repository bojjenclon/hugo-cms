import Router from 'next/router';

const axios = require('axios');
const api = axios.create({
	withCredentials: true
});

const prod = process.env.NODE_ENV === 'production';
const API_ENDPOINT = `${prod ? '/api' : 'http://localhost:3001'}`;

import Head from "next/head";

import {
  Button,
  Confirm,
  Container,
  Divider,
  Form,
  Grid,
  Header,
  Input,
  Image,
  Loader,
  List,
  Segment
} from "semantic-ui-react";

import * as React from "react";
import "./styles.css";

class Index extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,

      username: '',
      password: ''
    };
  }

  componentDidMount() {
    api.get(`${API_ENDPOINT}/isLoggedIn`)
      .then((({ data }) => {
        const { success } = data;

        if (success) {
          Router.replace('/cms');
        } else {
          this.setState({
            loading: false
          });
        }
      }));
  }

  get isLoading() {
    return this.state.loading;
  }

  onLogin = () => {
    const credentials = {
      username: this.state.username,
      password: this.state.password
    };

    api.post(`${API_ENDPOINT}/login`, credentials)
      .then(({ data }) => {
        const { message } = data;

        if (message === 'success') {
          Router.push('/cms');
        }
      });
  }

  loadingContent() {
    return (
      <Loader active={this.isLoading} indeterminate size='massive'>Loading</Loader>
    );
  }

  mainContent() {
    return (
      <Container>
        <Grid textAlign='center' verticalAlign='middle' style={{ height: '100vh' }}>
          <Grid.Column style={{ maxWidth: 450 }}>
          <Header as='h2' color='teal' textAlign='center'>
            <Image src='/static/Hugo-Logo-Big.png' style={{ width: '3.5em' }} /> <span style={{ verticalAlign: 'text-top' }}>Log-in to your account</span>
          </Header>

            <Form size='large'>
              <Segment stacked>
                <Form.Input 
                  fluid 
                  icon='user' 
                  iconPosition='left' 
                  placeholder='Username'
                  onChange={(evt) => this.setState({ username: evt.target.value })}
                />
                <Form.Input
                  fluid
                  icon='lock'
                  iconPosition='left'
                  placeholder='Password'
                  type='password'
                  onChange={(evt) => this.setState({ password: evt.target.value })}
                />

                <Button color='teal' fluid size='large' onClick={this.onLogin}>
                  Login
                </Button>
              </Segment>
            </Form>
          </Grid.Column>
        </Grid>
        
      </Container>
    );
  }

  render() {
    return (
      <div>
        <Head>
          <title>Hugo CMS - Login</title>
    
          <link
            rel="stylesheet"
            href="//cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.11/semantic.min.css"
          />
        </Head>
    
        { this.isLoading ? this.loadingContent() : this.mainContent() }
      </div>
    );
  }
}

export default Index;
