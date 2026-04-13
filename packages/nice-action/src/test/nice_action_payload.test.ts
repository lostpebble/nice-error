import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { action } from "../NiceAction/ActionSchema/action";
import { createActionDomain } from "../NiceAction/createActionDomain";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../NiceAction/NiceActionResponse";

const createTestActionDomain = () =>
  createActionDomain({
    domain: "test_domain",
    schema: {
      send_message: action()
        .input({ schema: v.object({ message: v.string(), channel: v.string() }) })
        .output({
          schema: v.object({
            lastFiveMessages: v.array(v.string()),
          }),
        }),
    },
  });

describe("Nice Action as an API Payload", () => {
  it("Should be serializable to JSON and deserializable back to the same action definition", () => {
    const actionDomain = createTestActionDomain();
    const sendMessageActionPayload = actionDomain
      .primeAction("send_message", {
        channel: "test",
        message: "Hello",
      })
      .toJsonObject();

    expect(sendMessageActionPayload).toEqual({
      allDomains: ["test_domain"],
      domain: "test_domain",
      id: "send_message",
      input: {
        channel: "test",
        message: "Hello",
      },
    });

    const hydratedAction = actionDomain.hydrateAction(sendMessageActionPayload);

    expect(hydratedAction).toBeInstanceOf(NiceActionPrimed);
    expect(hydratedAction.id).toEqual("send_message");
    expect(hydratedAction.input).toEqual({ channel: "test", message: "Hello" });
    expect(hydratedAction).toEqual(
      actionDomain.action("send_message").prime({ channel: "test", message: "Hello" }),
    );

    const secondPayload = hydratedAction.toJsonObject();

    expect(secondPayload).toEqual(sendMessageActionPayload);
  });

  it("Should throw if the action ID in the payload is not in the domain schema", () => {
    const actionDomain = createTestActionDomain();
    const invalidPayload = {
      allDomains: ["test_domain"],
      domain: "test_domain",
      id: "non_existent_action",
      input: {},
    };

    expect(() => actionDomain.hydrateAction(invalidPayload as any)).toThrow();
  });

  it("Should be able to make a NiceActionResponse from a payload", () => {
    const actionDomain = createTestActionDomain();
    const sendMessageActionPayload = actionDomain
      .primeAction("send_message", {
        channel: "test",
        message: "Hello",
      })
      .toJsonObject();

    const hydratedAction = actionDomain.hydrateAction(sendMessageActionPayload);

    expect(hydratedAction.id).toEqual("send_message");

    if (hydratedAction.id !== "send_message") {
      throw new Error("Unexpected action ID");
    }

    const lastMessage = hydratedAction.input.message;

    const actionResponse = hydratedAction.setOutput({
      lastFiveMessages: [lastMessage, "Hi", "Hey", "Hola", "Bonjour"],
    });

    const responseJson = actionResponse.toJsonObject(); // Should not throw

    expect(responseJson).toEqual({
      ok: true,
      output: {
        lastFiveMessages: ["Hello", "Hi", "Hey", "Hola", "Bonjour"],
      },
      domain: "test_domain",
      allDomains: ["test_domain"],
      id: "send_message",
      input: {
        channel: "test",
        message: "Hello",
      },
    });

    const hydratedResponse = actionDomain.hydrateResponse(responseJson);

    expect(hydratedResponse).toBeInstanceOf(NiceActionResponse);
    expect(hydratedResponse.primed).toEqual(hydratedAction);
    expect(hydratedResponse.result).toEqual({
      ok: true,
      output: {
        lastFiveMessages: ["Hello", "Hi", "Hey", "Hola", "Bonjour"],
      },
    });
  });
});
