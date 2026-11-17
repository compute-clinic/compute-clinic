---
name: uml-class
description: Create and review UML class diagrams with correct classes, responsibilities, attributes, operations, associations, multiplicities, inheritance, interfaces, aggregation, and composition.
---

# UML Class Diagram Skill

## Goal
Produce a meaningful domain/design class model, not a mechanical copy of database tables or source files.

## Class identification
For each candidate class ask:
- Does it represent a meaningful domain concept or design responsibility?
- Does it have its own identity or behavior?
- Is it merely a value that should instead be an attribute/value object?
- Is it only a screen, DTO, repository, controller, or framework artifact?

## Relationships
For every relationship explicitly determine:
- what each end means;
- multiplicity;
- navigability if relevant;
- ownership/lifecycle semantics if aggregation/composition is considered.

Never choose composition just because A contains B. Composition requires strong whole-part lifecycle semantics.

Never choose inheritance merely to reuse attributes. Ask whether the subtype is substitutable for the supertype and represents a genuine specialization.

## Responsibilities
Use operations only when behavior is important to the model. Avoid dumping every getter/setter into a conceptual diagram.

## Validation
Check for:
- orphan classes;
- duplicated responsibilities;
- god classes;
- inappropriate inheritance;
- unjustified composition;
- missing multiplicities where business rules require them;
- associations that should be modeled through a concept of their own.
