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
  = doc:Document { return doc; }

Document
  = "system" _ name:Identifier _ version:Version _ "{" _ body:Body _ "}" {
      return {
        type: "document",
        name,
        version,
        nodes: body.nodes,
        ports: body.ports,
        channels: body.channels,
        scenarios: body.scenarios,
      };
    }

Body
  = decls:(TopLevelDecl _)* {
      const nodes = [];
      const ports = [];
      const channels = [];
      const scenarios = [];
      for (const [decl] of decls) {
        if (decl.type === "node") nodes.push(decl);
        else if (decl.type === "port") ports.push(decl);
        else if (decl.type === "channel") channels.push(decl);
        else if (decl.type === "scenario") scenarios.push(decl);
      }
      return { nodes, ports, channels, scenarios };
    }

TopLevelDecl
  = NodeDecl
  / PortDecl
  / ChannelDecl
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

ScenarioDecl
  = "scenario" _ name:StringLiteral _ "{" _ steps:(StepDecl _)* _ "}" {
      return { type: "scenario", name, steps: steps.map(([step]) => step) };
    }

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
