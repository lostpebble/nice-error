import { describe, it } from "vitest";
import { test_makeActionData } from "#test/helpers/action";
import { fetchMockHandleAction, makeMockWs } from "#test/helpers/transport";
import { EActionState } from "../../NiceAction/NiceAction.enums";
import { ActionHandler } from "../ActionHandler/ActionHandler";
import { ActionRuntimeEnvironment } from "../ActionRuntimeEnvironment";
import { ActionConnect } from "./ActionConnect";
import { ConnectionConfig } from "./ConnectionConfig/ConnectionConfig";
import { ETransportType } from "./Transport/Transport.types";

function convertFromServerToClient(
  primed: INiceActionPrimed_JsonObject<any>,
): INiceActionPrimed_JsonObject<any> {}

describe("ActionConnect", () => {
  it("Should have a good interface", async () => {
    const mockWebSocket = makeMockWs();
    const { server, client } = test_makeActionData();

    const server_actionHandler = new ActionHandler().forDomain(server.test_dom_user, {
      execution: async (primed) => {
        if (primed.id === "sign_in") {
          return {
            success: true,
          };
        }
      },
    });

    const server_runtime = new ActionRuntimeEnvironment({ envId: "test_server" }).addHandlers([
      server_actionHandler,
    ]);

    server.root.setRuntimeEnvironment(server_runtime);

    const fetchMock = fetchMockHandleAction((input) => {
      // return server_runtime.
    });

    vi.stubGlobal("fetch", fetchMock);

    const client_actionConnect = new ActionConnect([
      new ConnectionConfig({
        transports: [
          {
            type: ETransportType.ws,
            createWebSocket: () => Promise.resolve({ ws: mockWebSocket as unknown as WebSocket }),
          },
          {
            type: ETransportType.http,
            url: "http://test.com/action",
          },
        ],
      }),
    ])
      .routeDomain(client.test_dom_user)
      .routeDomain(client.test_dom_edit_doc)
      .incomingRequestDomain(client.test_dom_push_doc);

    const client_runtime = new ActionRuntimeEnvironment({ envId: "test_client" }).addHandlers([
      client_actionConnect,
    ]);

    client.root.setRuntimeEnvironment(client_runtime);

    const signInResponse = await client.test_dom_user
      .action("sign_in")
      .execute({ username: "test", password: "pass" });

    expect(fetchMock).toHaveBeenCalledWith("http://test.com/action", expect.anything());
    expect(signInResponse).toEqual({
      success: true,
    });
  });
});
