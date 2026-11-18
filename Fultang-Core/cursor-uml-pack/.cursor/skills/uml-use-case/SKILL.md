---
name: uml-use-case
description: Derive and validate UML use-case diagrams from requirements, identifying actors, system boundaries, goals, include, extend, and generalization correctly.
---

# UML Use Case Skill

## Actor analysis
An actor is an external role interacting with the system, not necessarily a human and not necessarily a job title.

Identify:
- primary actors who initiate goals;
- supporting actors/services that participate in goals;
- actor generalization only when roles share a genuine common interaction contract.

## Use cases
Name use cases as user/business goals, normally with a verb phrase.
Do not create a use case for every button, CRUD operation, or internal method.

## include vs extend
Use `include` when a behavior is required/reused as part of the base use case.
Use `extend` when optional/conditional behavior extends a complete base use case under a stated condition.
Do not use include merely to decompose every sentence.

## Validation
Every important use case should correspond to a meaningful requirement or business goal. The diagram must show the system boundary and avoid representing internal implementation details as actors.
