import { expect as expectCDK, matchTemplate, MatchStyle } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as SymfonyApp from "../lib/symfony-app-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SymfonyApp.SymfonyAppStack(app, "MyTestStack", {
    dev: true,
  });
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
