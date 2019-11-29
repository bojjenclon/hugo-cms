import {
  Container,
  Image,
  Loader,
  Menu
} from "semantic-ui-react";

const MainMenu = (props) => (
  <Menu inverted>
    <Container>
      <Menu.Item as='a' href='/' header disabled={props.isBuildRunning}>
        <Image size='tiny' src='/static/Hugo-Logo.png' style={{ marginRight: '1.5em' }} />
        Hugo
      </Menu.Item>
      <Menu.Item as='a' onClick={props.newPostFn} disabled={props.isBuildRunning}>New Post</Menu.Item>
      <Menu.Item as='a' onClick={props.buildSiteFn} disabled={props.isBuildRunning} style={{ marginLeft: 'auto' }}>
        Build Site <Loader active={props.isBuildRunning} />
      </Menu.Item>
      <Menu.Item as='a' onClick={props.logoutFn} disabled={props.isBuildRunning}>
        Logout
      </Menu.Item>
    </Container>
  </Menu>
);

export default MainMenu;
