const ssrScript = require('./rehydrate');

function stringify(node, opts) {
  const { attributes = [], childNodes, nodeName, nodeValue, shadowRoot } = node;

  if (nodeName === "#text") {
    return nodeValue;
  }

  const localName = nodeName.toLowerCase();

  if (localName === "slot") {
    let currentNode = node,
      host;
    while ((currentNode = currentNode.parentNode)) {
      if (currentNode.host) {
        host = currentNode.host;
        break;
      }
    }

    const assignedNodes = node.assignedNodes();
    const hasAssignedNodes = !!assignedNodes.length;
    const nodesToRender = hasAssignedNodes ? assignedNodes : childNodes;

    // Since we're rendering the assigned nodes into the slots, we don't want
    // to render the light DOM so we must remove it from the host's childNodes.
    assignedNodes.forEach(n => {
      const index = host.childNodes.indexOf(n);
      if (index > -1) {
        host.childNodes.splice(index, 1);
      }
    });

    if (!hasAssignedNodes) {
      attributes.push({ name: "default", value: "" });
    }

    return `<slot${stringifyAttributes(attributes)}>${stringifyAll(
      nodesToRender,
      opts
    )}</slot>`;
  }

  const shadowNodes = shadowRoot
    ? stringify(shadowRoot, Object.assign({}, opts, { host: node }))
    : "";
  const lightNodes = stringifyAll(childNodes, opts);
  const rehydrationScript =
    nodeName === "SHADOW-ROOT" ? `<script>${opts.funcName}()</script>` : "";
  return `<${localName}${stringifyAttributes(
    attributes
  )}>${shadowNodes}${lightNodes}${rehydrationScript}</${localName}>`;
}

function stringifyAll(nodes, opts) {
  return nodes.map(node => stringify(node, opts)).join("");
}

function stringifyAttributes(attributes) {
  return Array.from(attributes || []).map(
    ({ name, value }) => ` ${name}="${value}"`
  );
}

function render(node, opts) {
  const { funcName, resolver } = Object.assign(
    {},
    {
      funcName: "__ssr",
      resolver: setTimeout
    },
    opts
  );
  document.body.appendChild(node);
  return new Promise(resolve => {
    resolver(() => {
      resolve(ssrScript(funcName) + stringify(node, { funcName }));
      document.body.removeChild(node);
    });
  });
}

module.exports = render;
