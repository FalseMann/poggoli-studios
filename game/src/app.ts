import {
  ArcRotateCamera,
  Color3,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import * as Colyseus from "colyseus.js";
import { MyRoomState } from "./schemas/MyRoomState";

const ROOM_NAME = "my_room";

export class App {
  canvas: HTMLCanvasElement;
  engine: Engine;
  network: Colyseus.Client;
  scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(this.canvas, true);
    this.network = new Colyseus.Client("ws://localhost:3001"); // TODO: make this configurable
    this.scene = this.buildScene();
  }

  async initialize() {
    await this.setupMultiplayer();
    this.setupInspector();

    window.addEventListener("resize", () => {
      this.engine.resize();
    });

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  private buildScene(): Scene {
    const scene = new Scene(this.engine);
    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      1.0,
      550,
      Vector3.Zero(),
      scene
    );
    // camera.attachControl(canvas, true);
    const light1: HemisphericLight = new HemisphericLight(
      "light1",
      new Vector3(1, 1, 0),
      scene
    );

    const ground = MeshBuilder.CreatePlane("ground", { size: 500 }, scene);
    ground.position.y = -15;
    ground.rotation.x = Math.PI / 2;

    return scene;
  }

  private async setupMultiplayer() {
    const room = await this.network.joinOrCreate<MyRoomState>(ROOM_NAME);

    const playerEntities: Record<string, Mesh> = {};
    const playerNextPosition: Record<string, Vector3> = {};

    room.state.players.onAdd((player, sessionId) => {
      const isCurrentPlayer = sessionId === room.sessionId;

      const sphere = MeshBuilder.CreateSphere(
        `player-${sessionId}`,
        {
          segments: 8,
          diameter: 40,
        },
        this.scene
      );

      sphere.material = new StandardMaterial(`playerMat-${sessionId}`);
      (sphere.material as StandardMaterial).emissiveColor = isCurrentPlayer
        ? Color3.FromHexString("#ff9900")
        : Color3.Gray();

      sphere.position.set(player.x, player.y, player.z);

      playerEntities[sessionId] = sphere;
      playerNextPosition[sessionId] = sphere.position.clone();

      player.onChange(() => {
        playerNextPosition[sessionId].set(player.x, player.y, player.z);
      });
    });

    room.state.players.onRemove((_player, sessionId) => {
      playerEntities[sessionId].dispose();
      delete playerEntities[sessionId];
      delete playerNextPosition[sessionId];
    });

    this.scene.onPointerDown = (event, pointer) => {
      if (event.button == 0 && pointer.pickedPoint) {
        var targetPosition = pointer.pickedPoint.clone();

        targetPosition.y = -1;
        if (targetPosition.x > 245) targetPosition.x = 245;
        else if (targetPosition.x < -245) targetPosition.x = -245;
        if (targetPosition.z > 245) targetPosition.z = 245;
        else if (targetPosition.z < -245) targetPosition.z = -245;

        playerNextPosition[room.sessionId] = targetPosition;

        room.send("updatePosition", {
          x: targetPosition.x,
          y: targetPosition.y,
          z: targetPosition.z,
        });
      }
    };

    this.scene.registerBeforeRender(() => {
      for (let sessionId in playerEntities) {
        const entity = playerEntities[sessionId];
        const targetPosition = playerNextPosition[sessionId];
        entity.position = Vector3.Lerp(entity.position, targetPosition, 0.05);
      }
    });
  }

  private setupInspector() {
    window.addEventListener("keydown", (ev) => {
      // Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (this.scene.debugLayer.isVisible()) {
          this.scene.debugLayer.hide();
        } else {
          this.scene.debugLayer.show();
        }
      }
    });
  }
}
