{
  function makeId(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 9);
  }

  function refToString(ref) {
    if (typeof ref === "string") return ref;
    if (ref.port) return ref.node + "." + ref.port;
    return ref.node;
  }
}

Start
  = _ doc:Document _ { return doc; }

Document
  = "system" _ name:Identifier _ version:Version _ "{" _ body:Body _ "}" {
      return {
        type: "document",
        name,
        version,
        nodes: body.nodes,
        ports: body.ports,
        channels: body.channels,
        patterns: body.patterns,
        scenarios: body.scenarios,
      };
    }

Body
  = decls:(TopLevelDecl _)* {
      const nodes = [];
      const ports = [];
      const channels = [];
      const patterns = [];
      const scenarios = [];
      for (const [decl] of decls) {
        if (decl.type === "node") nodes.push(decl);
        else if (decl.type === "port") ports.push(decl);
        else if (decl.type === "channel") channels.push(decl);
        else if (decl.type === "pattern") patterns.push(decl);
        else if (decl.type === "scenario") scenarios.push(decl);
      }
      return { nodes, ports, channels, patterns, scenarios };
    }

TopLevelDecl
  = NodeDecl
  / PortDecl
  / ChannelDecl
  / PatternDecl
  / ScenarioDecl

NodeDecl
  = kind:NodeKind _ id:Identifier _ props:PropertyBlock {
      return { type: "node", kind, id, props };
    }

NodeKind
  = "service" { return "service"; }
  / "database" { return "database"; }
  / "queue" { return "queue"; }
  / "gateway" { return "gateway"; }
  / "external" { return "external"; }

PortDecl
  = "port" _ node:Identifier "." port:Identifier _ props:PropertyBlock {
      return { type: "port", node, port, props };
    }

ChannelDecl
  = "channel" _ id:Identifier _ source:NodeRef _ "->" _ target:NodeRef _ props:PropertyBlock? {
      return { type: "channel", id, source, target, attrs: props ?? {} };
    }

ChannelAttrs
  = attrs:(PropertyPair _)* {
      const result = {};
      for (const [pair] of attrs) {
        const [k, v] = pair;
        result[k] = v;
      }
      return result;
    }

PatternDecl
  = "pattern" _ name:Identifier _ "{" _ body:PatternBody _ "}" {
      return { type: "pattern", name, params: body.params, handlers: body.handlers };
    }

PatternBody
  = items:(PatternBodyItem _)* {
      const params = [];
      const handlers = [];
      for (const [item] of items) {
        if (item.type === "param") params.push(item);
        else if (item.type === "handler") handlers.push(item);
      }
      return { params, handlers };
    }

PatternBodyItem
  = PatternParamDecl
  / PatternHandlerDecl

PatternParamDecl
  = "param" _ name:Identifier _ "=" _ value:PropertyValue {
      return { type: "param", name, defaultValue: value };
    }

PatternHandlerDecl
  = "onEvent" _ event:Identifier "(" _ payload:Identifier _ ")" _ "{" _ body:PatternStmtList _ "}" {
      return { type: "handler", event, payloadBinding: payload, body };
    }

PatternStmtList
  = items:(PatternStmt _)* { return items.map(([s]) => s); }

PatternStmt
  = PatternInvoke
  / PatternIf
  / PatternRetry
  / PatternHold
  / PatternEmit
  / PatternMutate

PatternInvoke
  = "invoke" _ target:Identifier "." method:Identifier "(" _ payload:Identifier _ ")" _ branches:PatternInvokeBranches? {
      return {
        type: "invoke",
        target,
        method,
        payloadBinding: payload,
        onSuccess: branches ? branches.onSuccess : undefined,
        onFailure: branches ? branches.onFailure : undefined,
      };
    }

PatternInvokeBranches
  = "{" _ items:(PatternInvokeBranch _)* _ "}" {
      let onSuccess = undefined;
      let onFailure = undefined;
      for (const [item] of items) {
        if (item.kind === "onSuccess") onSuccess = item.body;
        if (item.kind === "onFailure") onFailure = item.body;
      }
      return { onSuccess, onFailure };
    }

PatternInvokeBranch
  = "onSuccess" _ "{" _ body:PatternStmtList _ "}" {
      return { kind: "onSuccess", body };
    }
  / "onFailure" _ ("(" _ Identifier _ ")")? _ "{" _ body:PatternStmtList _ "}" {
      return { kind: "onFailure", body };
    }

PatternIf
  = "if" _ "(" _ condition:PatternExpr _ ")" _ "{" _ thenBody:PatternStmtList _ "}" _ elseBody:PatternElse? {
      return { type: "if", condition, then: thenBody, else: elseBody };
    }

PatternElse
  = "else" _ "{" _ body:PatternStmtList _ "}" { return body; }

PatternRetry
  = "retry" _ "(" _ ")" { return { type: "retry" }; }

PatternHold
  = "visual" "." "hold" "(" _ payload:Identifier _ "," _ "duration" _ ":" _ ms:Number _ label:("," _ "label" _ ":" _ s:StringLiteral { return s; })? _ ")" {
      return { type: "hold", payloadBinding: payload, durationMs: ms, label: label ?? undefined };
    }

PatternEmit
  = "emit" _ payloadType:Identifier "(" _ payload:Identifier _ ")" _ "->" _ target:Identifier {
      return { type: "emit", payloadType, payloadBinding: payload, target };
    }

PatternMutate
  = "mutate" _ node:Identifier _ patch:ObjectLiteral {
      return { type: "mutate", nodeId: node, patch };
    }

PatternExpr
  = left:PatternAtom _ op:CompareOp _ right:PatternAtom {
      return { type: "compare", op, left, right };
    }
  / PatternAtom

CompareOp
  = "<=" { return "<="; }
  / ">=" { return ">="; }
  / "==" { return "=="; }
  / "!=" { return "!="; }
  / "<" { return "<"; }
  / ">" { return ">"; }

PatternAtom
  = path:PatternRefPath { return { type: "ref", path }; }
  / n:Number { return { type: "literal", value: n }; }
  / s:StringLiteral { return { type: "literal", value: s }; }
  / "true" { return { type: "literal", value: true }; }
  / "false" { return { type: "literal", value: false }; }

PatternRefPath
  = head:Identifier tail:("." id:Identifier { return id; })+ {
      return [head, ...tail];
    }
  / id:Identifier { return [id]; }

ScenarioDecl
  = "scenario" _ name:StringLiteral _ "{" _ steps:(ScenarioItem _)* _ "}" {
      return { type: "scenario", name, steps: steps.map(([step]) => step) };
    }

ScenarioItem
  = ApplyDecl
  / StepDecl

ApplyDecl
  = "apply" _ pattern:Identifier _ "{" _ bindings:ApplyBindings _ "}" {
      return { type: "apply", pattern, bindings };
    }

ApplyBindings
  = pairs:(ApplyPair _)* {
      const result = {};
      for (const [pair] of pairs) {
        result[pair[0]] = pair[1];
      }
      return result;
    }

ApplyPair
  = key:Identifier _ ":" _ value:ApplyValue {
      return [key, value];
    }

ApplyValue
  = "[" _ items:OutcomeList _ "]" { return items; }
  / StringLiteral
  / Number
  / Identifier

OutcomeList
  = head:OutcomeValue tail:("," _ v:OutcomeValue { return v; })* {
      return [head, ...tail];
    }

OutcomeValue
  = "ok" { return "ok"; }
  / "fail" { return "fail"; }

StepDecl
  = "step" _ name:StringLiteral _ pattern:PatternTag? _ "{" _ body:StepBody _ "}" {
      return { type: "step", name, pattern, body };
    }

PatternTag
  = "[pattern:" _ id:Identifier _ "]" { return id; }

StepBody
  = items:(StepItem _)* { return items.map(([item]) => item); }

StepItem
  = Interaction
  / AnimateDecl
  / PrimitiveExpr

Interaction
  = source:NodeRef _ "->" _ target:NodeRef _ ":" _ label:InteractionLabel _ annotations:AnnotationBlock? {
      return { type: "interaction", source, target, label, annotations };
    }

InteractionLabel
  = chars:(!("\n") .)* { return text().trim(); }

AnnotationBlock
  = _ "annotations:" _ "[" _ items:AnnotationList _ "]" { return items; }

AnnotationList
  = head:Identifier tail:("," _ id:Identifier { return id; })* {
      return [head, ...tail];
    }

AnimateDecl
  = "animate" _ "payload:" _ data:ObjectLiteral {
      return { type: "animate", data };
    }

PrimitiveExpr
  = EmitExpr
  / MutateExpr
  / DelayExpr

EmitExpr
  = "emit" _ source:NodeRef _ "->" _ target:NodeRef _ "payload" _ payloadType:Identifier _ data:ObjectLiteral {
      return { type: "emit", source, target, payloadType, data };
    }

MutateExpr
  = "mutate" _ node:NodeRef _ patch:ObjectLiteral {
      return { type: "mutate", node, patch };
    }

DelayExpr
  = "delay" _ ms:Number _ "ms" {
      return { type: "delay", durationMs: ms };
    }

NodeRef
  = node:Identifier port:("." _ p:Identifier { return p; })? {
      return port ? { node, port } : node;
    }

PropertyBlock
  = "{" _ pairs:(PropertyPair _)* _ "}" {
      const result = {};
      for (const [pair] of pairs) {
        const [k, v] = pair;
        result[k] = v;
      }
      return result;
    }

PropertyPair
  = key:Identifier _ ":" _ value:PropertyValue {
      return [key, value];
    }

PropertyValue
  = StringLiteral
  / Number
  / Identifier

ObjectLiteral
  = "{" _ pairs:(ObjectPair _)* _ "}" {
      const result = {};
      for (const [pair] of pairs) {
        const [k, v] = pair;
        result[k] = v;
      }
      return result;
    }

ObjectPair
  = key:(Identifier / StringKey) _ ":" _ value:ObjectValue {
      return [key, value];
    }

StringKey
  = s:StringLiteral { return s; }

ObjectValue
  = StringLiteral
  / Number
  / Identifier
  / ObjectLiteral

Version
  = v:Identifier { return v; }

Identifier
  = [a-zA-Z_][a-zA-Z0-9_-]* { return text(); }

StringLiteral
  = "\"" chars:DoubleStringChar* "\"" { return chars.join(""); }
  / "'" chars:SingleStringChar* "'" { return chars.join(""); }

DoubleStringChar
  = !("\"" / "\\") char:. { return char; }
  / "\\" char:. { return char; }

SingleStringChar
  = !("'" / "\\") char:. { return char; }
  / "\\" char:. { return char; }

Number
  = [0-9]+ ("." [0-9]+)? { return parseFloat(text()); }

_ "whitespace"
  = ([ \t\n\r] / Comment)*

Comment
  = "//" [^\n]*
