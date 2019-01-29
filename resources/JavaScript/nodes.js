
//---------------------------------------------------------------------------------------
//----------------------------------- model section -------------------------------------
//---------------------------------------------------------------------------------------
let container = vis;
const nodeWidth = 300;
const nodeHeightEmpty = 144;
const callSiteWidth = 250;
const callSiteHeight = 27;
const callSiteTopOffset = 120;

/**
 * models the methods as nodes in a directed graph
 */
class node{
    /**
     *
     * @param {{node: node, index: number}} parent - parent-node, callsite-index of parent-node
     * @param {HTML svg object} container - svg
     * @param {string} nameVal - name of the method name
     * @param {string[]} contentVal - string array with the name of the targets
     * @param {string} declaringClass - dclaring Class of the mehtod
     * @param {string[]} parameterTypes - string array with the types of the parameters
     * @param {string} returnType - name of the returnType
     */
    constructor(parent, nameVal, contentVal, declaringClass, parameterTypes, returnType){
        this.parents = [];

        // Only if this is the root node, this node is placed right now. Otherwise it is placed by setPosition(x, y).
        // Also generation is set to 0
        if(parent == null){
            var width = nodeWidth;
            // var height = Math.min(500, 108 + 27 * contentVal.length);	// node-width, node-hight, and content-height are still hard coded
            let height = nodeHeightEmpty + callSiteHeight*contentVal.length;

            this.x = container.attr("width")/2 - width/2;
            this.y = container.attr("height")/2 - height/2;

            this.generation = 0;
            this.rootNode = this;
        }
        else{
            this.parents.push(parent);
        }
        this.container = container;
        this.name = nameVal;
        this.content = contentVal;
        this.declaringClass = declaringClass;
        this.parameterTypes = parameterTypes;
        this.returnType = returnType;
        this.children = [];		// target nodes
        this.declaredTargets = [];
        var length = contentVal.length;
        this.detailed = true;
        while(length-- > 0) this.declaredTargets.push(0);	// declaredTargets holds the number of child nodes to a given content element
        this.visible = null;	// this.visible == null: node has never been placed or displayed;
                                // this.visible == false: this node has valid x- and y-values, but is currently invisible
                                // this.visible == true: node has valid x- and y-values and is currently displayed

        // this is only for logging
        createdNodes++;
        if(createdNodes % 1000 == 0) console.log(createdNodes + " nodes created");
    }

    /**
     * sets the x and y values of this node
     *
     * @param {number} x - new x-value
     * @param {number} y - new y-value
     */
    setPosition(x, y){
        var width = 300;
        var height = 108 + 27 * this.content.length;

        this.x = x - width/2;
        this.y = y - height/2;
    }

    /**
     * adds a child node to the current node where parent and container are given by this node
     * this node also sets the child's rootNode, it's generation and updates his own children and declaredTargets
     *

     * @param {number} index - call-site-index-index of parent-node
     * @param {string} nameVal - child's title
     * @param {string[]} contentVal - string array with the name of the targets
     * @param {string} declaringClass - declaring class of the method
     * @param {string[]} parameterTypes - string array with the types of the parameters
     * @param {string} returnType - name of the returnType
     *
     * @returns {node object} - child node instance
     */
    addChild(index, nameVal, contentVal, declaringClass, parameterTypes, returnType){
        for(var i = 0; i < this.children.length; i++){	// child-node may only be created, if there doesn't exist a child with the given name yet
            if(this.children[i].node.getName() == nameVal) return;
        }

        var child = nodeMap.get(nameVal);

        if(!child){		// new node-instance is only created, if it didn't exist yet
            child = new node({node: this, index: index}, nameVal, contentVal, declaringClass, parameterTypes, returnType);
        }
        else child.addParent(this, index);		// if the child-node already existed, it just adds this as new parent

        child.setRootNode(this.rootNode);
        child.setGeneration(this.generation + 1);
        this.children.push({node: child, index: index});
        this.declaredTargets[index]++;
        this.reloadContent();
        return this.children[this.children.length-1].node;
    }

    /**
     * shows all child nodes of a single call site and displays an edge to them
     *
     * @param {number} index - index of the content array
     */
    showChildNodes(index){
        // if there exists a child-node with the given source index, the has never been placed, it must be placed with respect on the existing force tree
        for(var i = 0; i < this.children.length; i++){
            if(this.children[i].index == index){
                if(this.children[i].node.getVisibility() == null){ // if null, child-node has never been placed
                    this.placeChildNodes(index);
                    break;  // we break here, because the place-function places all child-nodes for the given index
                }
            }
        }
        // all child-nodes must be displayed right now
        for(var i = 0; i < this.children.length; i++){
            if(this.children[i].index == index){
                this.children[i].node.showNode();
            }
        }
        this.reloadEdges("showChildNodes", index);
    }

    /**
     * sets x and y values of all child nodes to a given call site index, but doesn't show these nodes yet
     *
     * @param {number} index - index of the content array
     */
    placeChildNodes(index){
        var childArray = [];
        var idArray = [];	// first an array with all the child-ids is created
        for(var i = 0; i < this.children.length; i++){
            var childIndex = this.children[i].index;
            if(childIndex == index && !this.children[i].node.getVisibility()){
                childArray.push(this.children[i]);
                idArray.push(this.children[i].node.getName());
            }
        }
        var positions = addNodeToForceTree(this.name, idArray);	// this function from the ForceTree.js file axtends for each node in
        // the idArray the invisible force graph and returns their positions

        for(var i = 0; i < childArray.length; i++){		// in the end the affected child-nodes are placed at the calculated positions
            childArray[i].node.setPosition(positions[i].x, positions[i].y);
        }
    }

    /**
     * displays this node
     */
    showNode(){
        if(this.visible != null){	// just changes the css-display property if the node was already placed before
            document.getElementById(this.name).style.display = "block";
        }
        else createSingleNode(this.container, this.x, this.y, this.name, this.content, this.declaredTargets);	// creates a new node otherwise
        this.visible = true;
    }



    /**
     * hides this node, if it was already displayed before
     * also hides all child-nodes of this node, if they don't have another visible parent
     */
    hideNode(){
        if(this.visible != null){

            let node = document.getElementById(this.name);	// now this node itself becomes hidden
            node.style.display = "none";
            this.visible = false;
            // this.visibleParentNodes = 0;	// visibleParentNodes is set to 0 because there is no node anymore with an edge to this node

            for(var i = 0; i < this.children.length; i++){
                let edgeID = this.name + '#' + this.children[i].index + '->' + this.children[i].node.getName();
                let edge = document.getElementById(edgeID);
                if(edge != undefined
                    && edge.style.display == 'block'
                    && this.children[i].node.getName() !== this.name) this.children[i].node.hideNode();
            }
            this.rootNode.showNode();	// the root-node shall always be visible
        }
        this.reloadEdges("hideNode", null);
    }

    /**
     * repositions all in- and outgoing edges of this node.
     * if in "showChildNodes"-mode, only handles outgoing edges for a given call-site-index
     *
     * @param{string} mode - declares which and how edges shall be reloaded
     * @param{number} callSiteIndex - function will only outgoing edges of the given call site
     */
    reloadEdges(mode, callSiteIndex){
        let thisNode = this;
        this.children.forEach(function(child){
            let edgeID = thisNode.name + '#' + child.index + '->' + child.node.getName();
            if(mode !== "showChildNodes" || callSiteIndex == child.index){  // if mode is "showChildNodes", the child must have the correct call-site-index
                handleSingleEdge(edgeID, thisNode, child.node, child.index, mode);
            }
        });

        if(mode !== "showChildNodes"){  // if mode is "showChildNodes" parent nodes are not affected
            this.parents.forEach(function(parent){
                // if edges shall just change their positions, it is necessary to adapt the mode to the parent's current detailed value
                if(mode === "toDetailed" || mode === "toAbstract"){ mode = parent.node.getDetailed() ? "toDetailed" : "toAbstract"}
                let edgeID = parent.node.getName() + '#' + parent.index + '->' + thisNode.name;
                handleSingleEdge(edgeID, parent.node, thisNode, parent.index, mode);
            });
        }

        /**
         * handles a single edge for reloadEdges()
         *
         * @param{string} edgeID - id of the affected edge
         * @param{node} parentNode - start of the edge
         * @param{node} childNode - destination of the edge
         * @param{number} index - child's call-site-index
         * @param{string} mode - declares how the edge shall be manipulated
         */
        function handleSingleEdge(edgeID, parentNode, childNode, index, mode){
            let edge = document.getElementById(edgeID);

            if(mode === "showChildNodes"){
                //  a new edge is only created, if it didn't exist yet
                if(!edge){
                    method2nodeEdge(edgeID.split('->')[0], edgeID.split('->')[1]);
                    toggleToDetailed(edgeID, {source: divPosition(parentNode, index), dest: divPosition(childNode)});
                    edge = document.getElementById(edgeID);
                }
                edge.style.display = 'block';
            }
            else if(mode === "hideNode"){
                if(edge) edge.style.display = 'none';
            }
            else if(mode === "toDetailed"){
                if(edge){
                    toggleToDetailed(edgeID, {source: divPosition(parentNode, index), dest: divPosition(childNode)});
                }
            }
            else if(mode === "toAbstract"){
                if(edge){
                    toggleToAbstract(edgeID, {source: divPosition(parentNode), dest: divPosition(childNode)});
                }
            }

        }

        /**
         * calculates the sizes of a given div, which can be a whole node or just a single call site
         *
         * @param{node} node - node instance, that represents the div
         * @param{number} index - call-site-index
         * @returns {{x: number, width: number, y: number, height: number}} sizes of the given div
         */
        function divPosition(node, index){
            if(index === undefined){    // if undefined the sizes of the whole node shall be returned
                let height = nodeHeightEmpty;
                // height variates, if node is currently in detailed mode or not
                if(node.getDetailed()) height += callSiteHeight*node.getContent().length;
                return {x: node.x, y: node.y, width: nodeWidth, height: height};
            }
            else{   // in else block, the size of a single call site shall be returned
                return {x: node.x + (nodeWidth-callSiteWidth)/2,
                            y: node.y + callSiteTopOffset + callSiteHeight*index,
                            width: callSiteWidth,
                            height: callSiteHeight};
            }
        }
    }

    /**
     * toggles this detailed attribute
     */
    toggleToDetailed(){
        this.detailed = true;
        this.reloadEdges("toDetailed", null);
    }

    toggleToAbstract(){
        this.detailed = false;
        this.reloadEdges("toAbstract", null);
    }

    /**
     * add a parent to the parent-array
     *
     * @param {node} parent - new parent
     * @param {number} index - call-site-index
     */
    addParent(parent, index){
        this.parents.push({node: parent, index: index});
    }

    /**
     * updates generation if new generation is smaller then current one
     *
     * @param {number} newGen - new possible generation value
     */
    setGeneration(newGen){
        if(this.generation == undefined || this.generation > newGen) this.generation = newGen;
    }

    /**
     * sets this root node
     *
     * @param {node} rootNode - new root node
     */
    setRootNode(rootNode){
        this.rootNode = rootNode;
    }

    /**
     * @returns {number} - generation = shortest path to root node
     */
    getGeneration(){ return this.generation; }


    /**
     * @returns {[node, number][]} - array of [parent, call-site-index]
     */
    getParents(){ return this.parents; }

    /**
     * @returns {number} - generation = shortest path to root node
     */
    getName(){ return this.name; }

    /**
     * @returns {string[]} - call sites
     */
    getContent(){ return this.content; }

    /**
     * @returns {node[]} - array of node-instances of the child-nodes
     */
    getChildNodes(){ return this.children; }

    /**
     * @returns {boolean or null} - null: node has never been placed or displayed;
     * 								false: this node has valid x- and y-values, but is currently invisible;
     *								true: node has valid x- and y-values and is currently displayed
     */
    getVisibility(){ return this.visible; }

    /**
     * @returns {boolean} - true if this node is currently showing call sites
     */
    getDetailed(){ return this.detailed; }

    /**
     * @returns {string} - declaring class of the method
     */
    getDeclaringClass(){ return this.declaringClass; }

    /**
     * @returns {string[]} - string array with the types of the parameters
     */
    getParameterTypes(){ return this.parameterTypes; }

    /**
     * @returns {string} - name of the returnType
     */
    getReturnType(){ return this.returnType; }

    /**
     * @returns {number} - number of visible parent nodes
     */
    // getVisibleParentNodes(){ return this.visibleParentNodes; }

    /**
     * sets visibleParentNodes of this node
     *
     * @param {number} - new number of visible parent nodes
     */
    // setVisibleParentNodes(number){ this.visibleParentNodes = number; }

    /**
     * reloads all call site numbers of this node
     */
    reloadContent(){
        if(this.visible){
            var methodDivs = document.getElementById(this.name).childNodes[2].childNodes;
            for(var i = 0; i < methodDivs.length; i++){
                methodDivs[i].childNodes[1].textContent = "(" + this.declaredTargets[i] + ")";
            }
        }
    }
}

//---------------------------------------------------------------------------------------
//------------------------------- view/control section ----------------------------------
//---------------------------------------------------------------------------------------

/**
 * plottes a single node with some given attributes
 *
 * @param {SVG-foreignObject element} cont - foreignObject-container
 * @param {number} x - left distance
 * @param {number} y - top distance
 * @param {string} name - node title
 * @param {string[]} content - array of call sites
 */
function createSingleNode(cont, x, y, name, content, declaredTargets){
    var node = cont.append("xhtml:div")
        .attr("id", name)
        .attr("class","div_node")
        .style("left", x + "px")
        .style("top", y + "px")
        .style("width", "300px")
        //.style("max-height", "500px")
        .style("padding", "20px")
        .style("border-width", "5px")	// sizes must stay in js-file for later calculations
    //.style("overflow", "auto")

    var packageStr = name.substring(0, name.lastIndexOf('/'));
    var classStr = name.substring(name.lastIndexOf('/')+1, name.indexOf('.'));
    var methodStr = name.substring(name.indexOf('.')+1, name.length);
    node.append("xhtml:h3")
        .text(packageStr)
        .style("text-align", "center")
        .style("overflow", "hidden");
    node.append("xhtml:h3")
        .text(classStr + "." + methodStr)
        .style("text-align", "center")
        .style("overflow", "hidden");

    node = node.append("xhtml:div")
        .attr("class","node_inhalt");

    for(var i=0; i < content.length; i++){
        var entry = node.append("xhtml:button")
            .attr("id", name + "#" + i)
            .attr("class", "methodButton")
            .on("click", function(){
                let index = this.getAttribute("id").split('#')[1];
                var node = nodeMap.get(name);
                node.showChildNodes(index); })
            .style("border-width", "2px")
            .style("border-top-width", (i == 0 ? "2px" : "0px"))
            .style("border-radius", "5px")
            .style("padding", "5px")
        entry.append("xhtaml:div")
            .attr("class", "contentElem")
            .text(i + ": " + content[i])
            .style("float", "left");
        entry.append("xhtaml:div")
            .text("(" + declaredTargets[i] + ")")
            .style("float", "right")
            .style("color", "#b0b0b0");
    }

    //on rightclick in this node calls rightclickmenu and deactivates normal contextmenu
    $("[id='" + name + "']").contextmenu(function(e) {
        if(menuIsOpen){
            $("#main-rightclick").remove();
            menuIsOpen = false;
        }
        clickedDiv = this;
        rightclickmenu(e);
        return false;
    });
}
