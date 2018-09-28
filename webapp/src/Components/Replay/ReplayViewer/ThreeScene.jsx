import React, {Component} from 'react'
import * as THREE from 'three'

export class ThreeScene extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        const width = this.mount.clientWidth;
        const height = this.mount.clientHeight;

        //ADD SCENE
        this.scene = new THREE.Scene();

        //ADD CAMERA
        this.camera = new THREE.PerspectiveCamera(
            110,
            width / height,
            0.1,
            20000
        );
        this.camera.position.z = 3840;
        this.camera.position.y = 125;

        this.camera.rotation.x -= 7 * Math.PI / 180;

        //ADD RENDERER
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setClearColor('#000000');
        this.renderer.setSize(width, height);
        this.mount.appendChild(this.renderer.domElement);

        // Add field
        this.generatePlayfield();

        // Add ball
        this.generateBall();

        // Add players
        this.generatePlayers(this.props.replayData.players.length);

        this.start();
        console.log(this);
    }

    componentWillUnmount() {
        this.stop();
        this.mount.removeChild(this.renderer.domElement)
    }

    start = () => {
        if (!this.frameId) {
            this.frameId = requestAnimationFrame(this.animate)
        }
    };

    stop = () => {
        cancelAnimationFrame(this.frameId)
    };

    animate = () => {
        this.ball.position.x = this.props.replayData.ball[this.props.frame][0];
        this.ball.position.y = this.props.replayData.ball[this.props.frame][2];
        this.ball.position.z = this.props.replayData.ball[this.props.frame][1];

        this.updatePlayers();

        this.camera.lookAt(this.ball.position);

        this.renderScene();
        this.frameId = window.requestAnimationFrame(this.animate)
    };

    renderScene = () => {
        this.renderer.render(this.scene, this.camera)
    };

    generatePlayfield = () => {
        const geometry = new THREE.BoxBufferGeometry( 8192, 1, 10240 );
        // const geometry = THREE.PlaneGeometry( 8192, 10240, 1 );;
        const material = new THREE.MeshBasicMaterial({color: '#4CAF50'});
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
    };

    generateBall = () => {
        const ballGeometry = new THREE.SphereBufferGeometry( 92.75, 32, 32 );
        const ballMaterial = new THREE.MeshBasicMaterial({color: '#2196f3'});
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.scene.add(this.ball);
    };

    generatePlayers = (numberOfPlayers) => {
        this.players = [];
        for (let i = 0; i < numberOfPlayers; i++) {
            const carGeometry = new THREE.BoxBufferGeometry( 80, 80, 80);
            const carMaterial = new THREE.MeshBasicMaterial({color: '#ff9800'});

            const player = new THREE.Mesh(carGeometry, carMaterial);
            this.scene.add(player);
            this.players.push(player);
        }
    };

    updatePlayers = () => {
        for (let i = 0, j = this.players.length; i<j; i++) {
            const playerPosition = this.props.replayData.players[i][this.props.frame];
            this.players[i].position.x = playerPosition[0];
            this.players[i].position.y = playerPosition[2];
            this.players[i].position.z = playerPosition[1];
        }
    };

    render() {
        return (
            <div
                style={{width: '800px', height: '400px', margin: 'auto'}}
                ref={(mount) => {
                    this.mount = mount
                }}
            />
        )
    }
}
