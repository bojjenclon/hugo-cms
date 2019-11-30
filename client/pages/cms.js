const axios = require('axios');
const api = axios.create({
	withCredentials: true
});

const sanitize = require('sanitize-filename');
const moment = require('moment');
const matter = require('gray-matter');
const toml = require('toml');

const prod = process.env.NODE_ENV === 'production';
const URL = 'https://example.com';
const API_ENDPOINT = prod ? `${URL}/api` : 'http://localhost:3001/api';

import Head from "next/head";
import Router from 'next/router';

import {
  Button,
  Confirm,
  Container,
  Divider,
  Grid,
  Input,
  List,
  Loader
} from "semantic-ui-react";

import * as React from "react";

import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import "./styles.css";

import { SemanticToastContainer, toast } from 'react-semantic-toasts';
import 'react-semantic-toasts/styles/react-semantic-alert.css';

import MainMenu from '../components/menu';

const matterConfig = {
  delims: '+++',
  engines: {
    toml: toml.parse.bind(toml)
  },
  language: 'toml'
};

class CMS extends React.Component {
  constructor(props) {
    super(props);

    const date = moment(),
      newPostTemplate = [
        '+++',
        'title = ""',
        'description = ""',
        `date = "${date.format()}"`,
        'categories = [',
        ']',
        'tags = [',
        ']',
        'draft = true',
        '+++',
        '',
        ''
      ].join('\n');

    this.state = {
      loading: true,

      config: props.config || {},

      posts: props.posts || [],
  
      isPostNew: true,
      currentPost: `${date.format('M-D-YYYY h-mm-ss A')}.md`,
  
      markdown: newPostTemplate,
      selectedTab: 'write',
  
      saveFileName: null,
  
      saveOpen: false,
      deleteOpen: false,

      buildRunning: false
    };
  }

  static async getInitialProps({ req, res }) {
    const { data: config } = await api.get(`${API_ENDPOINT}/config`);
    const { data: posts } = await api.get(`${API_ENDPOINT}/listPosts?path=${config.postPath}`);

    return {
      config,
      posts
    };
  }

  componentDidMount() {
      api.get(`${API_ENDPOINT}/isLoggedIn`)
        .then((({ data }) => {
          const { success } = data;
  
          if (!success) {
            Router.replace('/');
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

  get config() {
    return this.state.config;
  }

  get posts() {
    return this.state.posts;
  }

  get isPostNew() {
    return this.state.isPostNew;
  }

  get currentPost() {
    return this.state.currentPost;
  }

  get markdown() {
    return this.state.markdown;
  }

  get selectedTab() {
    return this.state.selectedTab;
  }

  get saveFileName() {
    return this.state.saveFileName;
  }

  get isSaveOpen() {
    return this.state.saveOpen;
  }

  get isDeleteOpen() {
    return this.state.deleteOpen;
  }

  get isBuildRunning() {
    return this.state.buildRunning;
  }

  onMarkdownChanged = (markdown) => {
    this.setState({
      markdown
    });
  }

  createNewPost = () => {
    const date = moment(),
      newPostTemplate = [
        '+++',
        'title = ""',
        'description = ""',
        `date = "${date.format()}"`,
        'categories = [',
        ']',
        'tags = [',
        ']',
        'draft = true',
        '+++',
        '',
        ''
      ].join('\n');

    this.setState({
      isPostNew: true,
      currentPost: `${date.format('M-D-YYYY h-mm-ss A')}.md`,

      markdown: newPostTemplate
    });
  }

  openSaveDialog = () => {
    let fname = this.currentPost;
    const content = matter(this.markdown, matterConfig),
      title = content.data.title;

    if (title && title.length > 0) {
      const titleFName = title
        .trim()
        .toLowerCase()
        .replace(/\s/g, '-');

      fname = `${!!titleFName.length ? titleFName : this.currentPost}.md`;
    }

    this.setState({
      saveFileName: fname,
      
      saveOpen: true
    });
  }

  closeSaveDialog = (cancelled = false) => {
    if (!cancelled) {
      this.onSave();
    }

    this.setState({
      saveOpen: false
    });
  }

  openDeleteDialog = () => {
    this.setState({
      deleteOpen: true
    });
  }

  closeDeleteDialog = (cancelled = false) => {
    if (!cancelled) {
      this.onDelete();
    }

    this.setState({
      deleteOpen: false
    });
  }

  openPost(postName) {
    api.get(`${API_ENDPOINT}/retrievePost?path=${this.config.postPath}/${postName}`)
      .then(({ data }) => {
        this.setState({
          isPostNew: false,
          currentPost: postName,
          markdown: data.content
        });
      });
  }

  onFileNameChange = (evt, data) => {
    const { placeholder, value } = data;

    this.setState({
      saveFileName: !!value.length ? value : placeholder
    });
  }

  onSave = () => {
    const { saveFileName, markdown } = this.state;
    const safeFileName = sanitize(saveFileName || '');

    if (safeFileName.length === 0) {
      return;
    }

    api.post(`${API_ENDPOINT}/savePost`, {
        path: `${this.config.postPath}/${safeFileName}`,
        content: markdown
      })
      .then(({ data }) => {
        const { success } = data;

        if (success) {
          toast({
            type: 'info',
            icon: 'save',
            title: 'Save Sucessful',
            description: 'The file has been saved succesfully.',
            animation: 'fade',
            time: 3000
          });
        } else {
          toast({
            type: 'error',
            icon: 'save',
            title: 'Save Failed',
            description: 'Something went wrong, the file was not saved.',
            animation: 'fade',
            time: 3000
          });
        }

        this.setState({
          isPostNew: false
        });

        // Pull new post list
        api.get(`${API_ENDPOINT}/listPosts?path=${this.config.postPath}`)
          .then(({ data }) => {
            this.setState({
              posts: data
            });
          });
      });
  }

  onDelete = () => {
    const { currentPost } = this.state;

    api.post(`${API_ENDPOINT}/deletePost`, {
        path: `${this.config.postPath}/${currentPost}`
      })
      .then(({ data }) => {
        const { success } = data;

        if (success) {
          toast({
            type: 'info',
            icon: 'delete',
            title: 'Delete Sucessful',
            description: 'The file has been deleted succesfully.',
            animation: 'fade',
            time: 3000
          });
        } else {
          toast({
            type: 'error',
            icon: 'delete',
            title: 'Delete Failed',
            description: 'Something went wrong, the file was not deleted.',
            animation: 'fade',
            time: 3000
          });
        }

        // Pull new post list
        api.get(`${API_ENDPOINT}/listPosts?path=${this.config.postPath}`)
          .then(({ data }) => {
            this.setState({
              posts: data
            });

            this.createNewPost();
          });
      });
  }

  buildSite = () => {
    this.setState({
      buildRunning: true
    });

    api.post(`${API_ENDPOINT}/buildSite`, { path: this.config.rootPath })
      .then(({ data }) => {
        const { success } = data;

        if (success) {
          toast({
            type: 'info',
            icon: 'wrench',
            title: 'Build Sucessful',
            description: 'The website has been built succesfully.',
            animation: 'fade',
            time: 3000
          });
        } else {
          toast({
            type: 'error',
            icon: 'wrench',
            title: 'Build Failed',
            description: 'Something went wrong, the website was not properly built.',
            animation: 'fade',
            time: 3000
          });
        }

        this.setState({
          buildRunning: false
        });
      });
  }

  onLogout = () => {
    api.post(`${API_ENDPOINT}/logout`)
      .then(({ data }) => {
        const { success } = data;

        if (success) {
          Router.push('/');
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
      <div>
        <MainMenu
          newPostFn={this.createNewPost}
          buildSiteFn={this.buildSite}
          logoutFn={this.onLogout}
          isBuildRunning={this.isBuildRunning}
        />
    
        <Container style={{ height: 'calc(100% - 6em)', marginTop: '2em' }}>
          <Grid divided style={{ height: '100%' }}>
            <Grid.Column width={5}>
              <Container>
                <Divider horizontal style={{ marginBottom: '2em' }}>Files</Divider>
    
                <List divided relaxed style={{ maxHeight: '768px', overflowY: 'auto' }}>
                  {this.posts.map((postName) => {
                    const activePost = this.state.currentPost === postName;

                    return (
                      <List.Item 
                        active={activePost}
                        disabled={this.isBuildRunning}
                        as={activePost ? '' : 'a'} 
                        key={postName} 
                        onClick={this.openPost.bind(this, postName)}
                      >
                        <List.Icon name='file' />
                        <List.Content>{ postName }</List.Content>
                      </List.Item>
                    );
                  })}
                </List>
              </Container>
            </Grid.Column>
    
            <Grid.Column width={11}>
              <Container text>
                <Divider horizontal style={{ marginBottom: '2em' }}>Post</Divider>
   
                <SimpleMDE
                  id="markdown-editor"
                  value={this.markdown}
                  onChange={this.onMarkdownChanged}
                  options={{
                    spellChecker: false
                  }}
                />

                <Button.Group attached='bottom'>
                  <Button 
                    negative
                    onClick={this.openDeleteDialog}
                    disabled={this.isPostNew || this.isBuildRunning}
                  >
                    Delete
                  </Button>

                  <Button 
                    primary 
                    onClick={this.openSaveDialog}
                    disabled={this.isBuildRunning}
                  >
                    Save
                  </Button>
                </Button.Group>
                
                <Confirm
                  open={this.isSaveOpen}
                  onCancel={this.closeSaveDialog.bind(this, true)}
                  onConfirm={this.closeSaveDialog.bind(this, false)}
                  content={
                    <div className='content'>
                      <Grid>
                        <Grid.Column width={2} verticalAlign='middle'>
                          <strong>Saving as:</strong>
                        </Grid.Column>

                        <Grid.Column width={14} verticalAlign='middle'>
                          <Input 
                            fluid 
                            icon='save' 
                            placeholder={this.saveFileName}
                            onChange={this.onFileNameChange}
                          />
                        </Grid.Column>
                      </Grid>
                    </div>
                  }
                  confirmButton='Confirm'
                />

                <Confirm
                  open={this.isDeleteOpen}
                  onCancel={this.closeDeleteDialog.bind(this, true)}
                  onConfirm={this.closeDeleteDialog.bind(this, false)}
                  content={`Are you sure you want to delete ${this.currentPost}?`}
                  confirmButton='Confirm'
                />
              </Container>
            </Grid.Column>
          </Grid>
        </Container>

        <SemanticToastContainer position='bottom-left' />
    
        <style global jsx>{`
          html,
          body,
          body > div:first-child,
          div#__next,
          div#__next > div {
            height: 100%;
          }
        `}</style>
      </div>
    );
  }

  render() {
    return (
      <div>
        <Head>
          <title>Hugo CMS</title>
    
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

export default CMS;
