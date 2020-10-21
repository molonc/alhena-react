import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";

import { withStyles } from "@material-ui/core/styles";

import { Query } from "react-apollo";
import gql from "graphql-tag";

import _ from "lodash";

import Grid from "@material-ui/core/Grid";

import { useStatisticsState } from "../DashboardState/statsState";
import { scaleLinear } from "d3-scale";
import d3Tip from "d3-tip";

import { initContext } from "../utils.js";

const scatterplotDimension = 550;
const axisTextPadding = 55;
const histogramMaxHeight = 55;

const margin = {
  left: 75,
  top: 37,
  bottom: 90,
  right: 10,
  histogram: 20
};
const scatterplotDim = {
  x1: margin.left,
  y1: margin.top + histogramMaxHeight,
  x2: scatterplotDimension - margin.right,
  y2: scatterplotDimension - margin.bottom
};
const selfType = "SCATTERPLOT";
const styles = theme => ({
  legend: {
    marginTop: 40,
    marginRight: 30,
    marginLeft: 15
  }
});

const SCATTERPLOT_QUERY = gql`
  query scatterplot(
    $analysis: String!
    $quality: String!
    $selectedCells: [Int!]
    $xAxis: String!
    $yAxis: String!
  ) {
    scatterplot(
      analysis: $analysis
      quality: $quality
      selectedCells: $selectedCells
      xAxis: $xAxis
      yAxis: $yAxis
    ) {
      points {
        heatmapOrder
        x
        y
      }
      stats {
        yMax
        yMin
        xMax
        xMin
      }
      histogram {
        xBuckets {
          key
          count
        }
        yBuckets {
          key
          count
        }
      }
    }
  }
`;

const Scatterplot = ({ analysis, classes }) => {
  const [
    { quality, selectedCellsDispatchFrom, selectedCells, scatterplotAxis }
  ] = useStatisticsState();

  const xAxis = scatterplotAxis.x.type;
  const yAxis = scatterplotAxis.y.type;
  const selection = selectedCellsDispatchFrom === selfType ? [] : selectedCells;

  return (
    <Query
      query={SCATTERPLOT_QUERY}
      variables={{
        analysis,
        quality,
        selectedCells: selection,
        xAxis,
        yAxis
      }}
    >
      {({ loading, error, data }) => {
        if (error) return null;
        if (loading && Object.keys(data).length === 0) {
          return null;
        }
        const { scatterplot } = data;

        return (
          <Grid
            container
            direction="row"
            justify="flex-start"
            alignItems="flex-start"
            key="scatterplot"
          >
            <Grid item key="scatterplotWrapper">
              <Plot
                data={scatterplot.points}
                stats={scatterplot.stats}
                histogram={scatterplot.histogram}
                selectionAllowed={
                  selectedCellsDispatchFrom === selfType ||
                  selectedCellsDispatchFrom === null ||
                  selectedCellsDispatchFrom === undefined
                }
                key="plot"
              />
            </Grid>
          </Grid>
        );
      }}
    </Query>
  );
};

const Plot = ({ data, stats, histogram, selectionAllowed }) => {
  const [
    { scatterplotAxis, selectedCells, selectedCellsDispatchFrom },
    dispatch
  ] = useStatisticsState();
  const [context, saveContext] = useState();
  const [savedCanvas, saveCanvas] = useState();

  var polyList = [];
  const [ref] = useHookWithRefCallback();

  var lassPath = "";

  var mousePos = { x: 0, y: 0 };

  var x = d3
    .scaleLinear()
    .domain([stats.xMin, stats.xMax])
    .range([scatterplotDim.x1, scatterplotDim.x2])
    .nice();

  var y = d3
    .scaleLinear()
    .domain([stats.yMax, stats.yMin])
    .range([scatterplotDim.y1, scatterplotDim.y2])
    .nice();

  useEffect(() => {
    if (selectedCells.length === 0 && context) {
      polyList = [];
      lassPath = "";

      context.clearRect(
        0,
        0,
        scatterplotDimension + histogramMaxHeight + margin.histogram,
        scatterplotDimension + histogramMaxHeight + margin.histogram
      );

      drawPoints(context, data);
      drawAxis(context, x, y);
      drawAxisLabels(context, x, y, stats, scatterplotAxis);

      drawHistogram(context, histogram, stats, x, y);
    }
  }, [selectedCells]);

  useEffect(() => {
    if (selectedCells.length === 0 && context) {
      context.restore();

      drawPoints(context, data);
      drawAxis(context, x, y);
      drawAxisLabels(context, x, y, stats, scatterplotAxis);

      drawHistogram(context, histogram, stats, x, y);
    }
  }, [selectedCells]);

  useEffect(() => {
    if (context) {
      context.clearRect(
        0,
        0,
        scatterplotDimension + histogramMaxHeight + margin.histogram,
        scatterplotDimension + histogramMaxHeight + margin.histogram
      );

      const newData = d3
        .select("#scatterSelection")
        .selectAll("rect")
        .data(data);
      //old data to remove
      newData.exit().remove();
      //old data to update
      newData
        .attr("x", function(d) {
          return x(d.x);
        })
        .attr("y", function(d) {
          return y(d.y);
        });
      //new data to add
      newData
        .enter()
        .append("rect")
        .attr("width", 1)
        .attr("height", 1)
        .attr("x", function(d) {
          return x(d.x);
        })
        .attr("y", function(d) {
          return y(d.y);
        });

      saveContext(context);
      drawPoints(context, data);
      drawAxis(context, x, y);
      drawAxisLabels(context, x, y, stats, scatterplotAxis);

      drawHistogram(context, histogram, stats, x, y);
      if (!selectionAllowed || selectedCells.length > 0) {
        removePointerEventsFromCanvas();
      } else {
        appendPointerEventsToCanvas();
      }
    }
  }, [data]);

  var tooltip = d3Tip()
    .attr("class", "d3-tip n")
    .attr("id", "scatterTip");

  function useHookWithRefCallback() {
    const ref = useRef(null);
    const setRef = useCallback(node => {
      if (node) {
        const scatter = d3.select("#scatterplot");
        const canvas = scatter
          .select("canvas")
          .attr(
            "width",
            scatterplotDimension + histogramMaxHeight + margin.histogram
          )
          .attr("height", scatterplotDimension)
          .attr(
            "transform",
            "translate(" + margin.left + "," + margin.top + ")"
          );

        const scatterSelection = d3.select("#scatterSelection");

        scatterSelection
          .selectAll("rect")
          .data(data)
          .enter()
          .append("rect")
          .attr("width", 1)
          .attr("height", 1)
          .attr("x", function(d) {
            return x(d.x);
          })
          .attr("y", function(d) {
            return y(d.y);
          });

        const context = initContext(
          canvas,
          scatterplotDimension + histogramMaxHeight + margin.histogram,
          scatterplotDimension
        );
        saveContext(context);
        appendEventListenersToCanvas(context);
      }
    }, []);

    return [setRef];
  }

  //taken from
  //https://gist.github.com/maxogden/574870
  function isPointInPoly(poly, pt) {
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
      ((poly[i][1] <= pt.y && pt.y < poly[j][1]) ||
        (poly[j][1] <= pt.y && pt.y < poly[i][1])) &&
        pt.x <
          ((poly[j][0] - poly[i][0]) * (pt.y - poly[i][1])) /
            (poly[j][1] - poly[i][1]) +
            poly[i][0] &&
        (c = !c);
    return c;
  }

  function setMousePosition(e, boundingRect) {
    mousePos.x = e.clientX - boundingRect.left;
    mousePos.y = e.clientY - boundingRect.top;
  }

  function drawLasso(e, context, boundingRect) {
    // mouse left button must be pressed
    if (e.buttons !== 1) return;

    context.lineCap = "round";
    context.strokeStyle = "#c0392b";
    context.lineWidth = 3;

    context.moveTo(mousePos.x, mousePos.y);
    polyList = [...polyList, [mousePos.x, mousePos.y]];
    lassPath +=
      lassPath === ""
        ? "M " + mousePos.x + " " + mousePos.y + " "
        : "L " + mousePos.x + " " + mousePos.y + " ";

    setMousePosition(e, boundingRect);

    context.lineTo(mousePos.x, mousePos.y);
    lassPath += "L " + mousePos.x + " " + mousePos.y + " ";
    polyList = [...polyList, [mousePos.x, mousePos.y]];

    context.stroke();
  }
  const removePointerEventsFromCanvas = () => {
    var docCanvas = document.getElementById("scatterCanvas");
    docCanvas.style.pointerEvents = "none";
  };
  const appendPointerEventsToCanvas = () => {
    var docCanvas = document.getElementById("scatterCanvas");
    docCanvas.style.pointerEvents = "all";
  };
  const appendEventListenersToCanvas = context => {
    var docCanvas = document.getElementById("scatterCanvas");
    const scatterSelection = d3.select("#scatterSelection");
    const canvas = d3.select("#scatterplot").select("canvas");
    docCanvas.addEventListener(
      "mousemove",
      function(e) {
        drawLasso(e, context, this.getBoundingClientRect());
      },
      false
    );

    docCanvas.addEventListener(
      "mousedown",
      function(e) {
        context.restore();
        context.beginPath();
        polyList = [];
        setMousePosition(e, this.getBoundingClientRect());
      },
      false
    );

    docCanvas.addEventListener(
      "mouseenter",
      function(e) {
        setMousePosition(e, this.getBoundingClientRect());
      },
      false
    );
    docCanvas.addEventListener(
      "mouseup",
      function(e) {
        const bouding = canvas.node().getBoundingClientRect();
        context.save();

        context.strokeWidth = 1;
        context.globalAlpha = 0.5;
        context.strokeStyle = "purple";
        context.fillStyle = "black";

        context.fill();
        var lassoSvgPath = new Path2D(lassPath);

        context.fill(lassoSvgPath, "evenodd");
        context.closePath();

        var selectedNodes = [];
        scatterSelection.selectAll("rect").each(function(d) {
          const that = d3.select(this);
          if (isPointInPoly(polyList, { x: x(d.x), y: y(d.y) })) {
            selectedNodes = [...selectedNodes, d["heatmapOrder"]];
          }
        });

        context.restore();

        lassPath = "";
        if (selectedNodes.length > 0) {
          const highlightedCellsObject = createHighlightedObjectFromArray(
            selectedNodes
          );
          drawPoints(context, data, highlightedCellsObject);
          saveContext(context);
          dispatch({
            type: "BRUSH",
            value: selectedNodes,
            dispatchedFrom: selfType
          });
        }
      },
      false
    );
    drawPoints(context, data);
    drawAxis(context, x, y);
    drawAxisLabels(context, x, y, stats, scatterplotAxis);

    drawHistogram(context, histogram, stats, x, y);

    scatterSelection.call(tooltip);
  };
  const drawAxisLabels = (context, x, y, stats, labels) => {
    context.save();
    context.translate(
      x(x.domain()[0]) - axisTextPadding,
      scatterplotDimension / 2
    );
    context.rotate(-Math.PI / 2);

    context.fillText(labels.y.label, 0, 0);

    context.restore();
    context.fillText(
      labels.x.label,
      scatterplotDimension / 2,
      y(y.domain()[1]) + axisTextPadding
    );
    context.stroke();
    context.save();
  };

  const drawAxis = (context, x, y) => {
    const tickFormat = d3.format(".2s");

    x.ticks(15).forEach(function(d) {
      context.fillStyle = "#000000";
      context.fillText(
        d > 1000 ? tickFormat(d) : d,
        x(d),
        scatterplotDim.y2 + margin.histogram
      );
    });

    y.ticks(15).forEach(function(d) {
      context.fillStyle = "#000000";
      context.fillText(
        d > 1000 ? tickFormat(d) : d,
        scatterplotDim.x1 - 30,
        y(d)
      );
    });
    context.beginPath();
    context.moveTo(scatterplotDim.x1, scatterplotDim.y1);
    context.lineTo(scatterplotDim.x1, scatterplotDim.y2);
    context.stroke();

    context.beginPath();
    context.moveTo(scatterplotDim.x1, scatterplotDim.y2);
    context.lineTo(scatterplotDim.x2, scatterplotDim.y2);
    context.stroke();
  };

  const drawPoints = (context, data, highlightedCells) => {
    context.beginPath();
    context.lineWidth = 1;
    context.strokeStyle = "black";

    data.map(point => {
      context.beginPath();
      context.arc(x(point.x), y(point.y), 4, 0, Math.PI * 2, true);
      if (!highlightedCells) {
        context.fillStyle = "#3498db";
      } else if (
        highlightedCells &&
        highlightedCells.hasOwnProperty(point.heatmapOrder)
      ) {
        context.fillStyle = "#3498db";
      } else {
        context.fillStyle = "#d2d7d3";
      }
      context.fill();
      context.stroke();
    });
  };

  const createHighlightedObjectFromArray = highlightedCells =>
    highlightedCells.reduce((final, heatmapOrder) => {
      final[heatmapOrder] = true;
      return final;
    }, {});

  const getHeatmapOrderFromExtent = (extent, data) =>
    data
      .filter(
        point =>
          point.y >= extent[1][1] &&
          point.y <= extent[0][1] &&
          point.x >= extent[0][0] &&
          point.x <= extent[1][0]
      )
      .map(entry => entry.heatmapOrder);

  const drawHistogram = (context, data, stats, x, y) => {
    const barPadding = { width: 5, height: 2, margin: 10 };

    const xBarWidth = data.xBuckets[1]
      ? x(data.xBuckets[1].key) - x(data.xBuckets[0].key) - barPadding.width
      : -x(data.xBuckets[0].key) - barPadding.width;
    const xBucketCountMax = _.maxBy(data.xBuckets, "count").count;

    const yBucketCountMax = _.maxBy(data.yBuckets, "count").count;

    const yBarHeight = data.yBuckets[1]
      ? y(data.yBuckets[1].key) - y(data.yBuckets[0].key) - barPadding.height
      : y(data.yBuckets[0].key) - barPadding.height;

    const xBucketHeightScale = d3
      .scaleLinear()
      .domain([xBucketCountMax, 0])
      .range([margin.top, scatterplotDim.y1])
      .nice();

    const yBucketWidthScale = d3
      .scaleLinear()
      .domain([0, yBucketCountMax])
      .range([
        scatterplotDim.y2,
        scatterplotDim.y2 + histogramMaxHeight + barPadding.margin
      ])
      .nice();

    const xBucketZero = xBucketHeightScale(0);
    const yBucketZero = yBucketWidthScale(0);

    data.yBuckets.forEach(bucket => {
      const width = yBucketWidthScale(bucket.count);
      context.beginPath();
      context.fillStyle = "#e8ecf1";
      context.fillRect(
        scatterplotDim.x2 + barPadding.margin,
        y(bucket.key) + barPadding.height,
        width - yBucketZero,
        yBarHeight + barPadding.width
      );
      context.stroke();

      context.fillStyle = "#6c7a89";
      context.rect(
        scatterplotDim.x2 + barPadding.margin,
        y(bucket.key),
        width - yBucketZero,
        yBarHeight + barPadding.width
      );
      context.stroke();
    });

    data.xBuckets.forEach(bucket => {
      const y1 = xBucketHeightScale(bucket.count);
      context.beginPath();
      context.fillStyle = "#e8ecf1";
      context.fillRect(
        x(bucket.key),
        y1 - barPadding.margin,
        xBarWidth,
        xBucketZero - y1
      );
      context.stroke();
      context.fillStyle = "#6c7a89";
      context.rect(
        x(bucket.key),
        y1 - barPadding.margin,
        xBarWidth,
        xBucketZero - y1
      );
      context.stroke();
    });
  };

  return (
    <div
      style={{
        width: scatterplotDimension,
        height: scatterplotDimension,
        position: "relative"
      }}
      ref={ref}
    >
      <div
        id="scatterplot"
        style={{
          width: scatterplotDimension,
          height: scatterplotDimension,
          position: "absolute",
          pointerEvents: "all"
        }}
      >
        <canvas id="scatterCanvas" />
      </div>
      <svg
        id="scatterSelection"
        style={{
          width: scatterplotDimension,
          height: scatterplotDimension,
          position: "unset"
        }}
      />
    </div>
  );
};
/*      <svg
        id="scatterSelection"
        style={{
          width: scatterplotDimension,
          height: scatterplotDimension,
          position: "unset"
        }}
      />*/
/*        <svg
          id="scatterSelection"
          style={{
            width: scatterplotDimension,
            height: scatterplotDimension,
            position: "relative"
          }}
        />*/
export default withStyles(styles)(Scatterplot);
