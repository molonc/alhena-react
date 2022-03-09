import React, { useState, useEffect } from "react";
import { makeStyles } from "@mui/styles";
import _ from "lodash";

import {
  Grid,
  Button,
  TextField,
  Typography,
  InputAdornment
} from "@mui/material";

import SnackbarContentWrapper from "../Misc/SnackBarPopup.js";

import { gql, useLazyQuery } from "@apollo/client";

const UPDATEDASHBOARDLABLES = gql`
  query updateDashboardColumns($columns: [DashboardColumnsInput]) {
    updateDashboardColumns(columns: $columns) {
      updated
    }
  }
`;
const AdminSettings = ({ data }) => {
  const [error, setError] = useState(null);
  const originalLabels = data.reduce((final, d) => {
    final[d.type] = d.label;
    return final;
  }, {});
  const [labels, setLabels] = useState(originalLabels);

  const [updateLabels, { data: isUpdated }] = useLazyQuery(
    UPDATEDASHBOARDLABLES
  );
  useEffect(() => {
    if (isUpdated) {
      if (isUpdated.updateDashboardColumns.updated) {
        window.location.reload();
      } else {
        setError(14);
        //error
      }
    }
  }, [isUpdated]);

  return (
    <Grid
      container
      spacing={2}
      direction="column"
      justify="flex-start"
      alignItems="flex-start"
      sx={{ padding: "30px !important" }}
    >
      {error && (
        <SnackbarContentWrapper
          variant="error"
          errorNumber={error}
          setError={setError}
        />
      )}
      <Typography variant="h5">Search Table Labeling</Typography>
      <Grid
        container
        spacing={2}
        direction="row"
        justify="flex-start"
        alignItems="flex-start"
        sx={{ padding: "15px !important" }}
      >
        <Grid
          container
          spacing={2}
          direction="column"
          justify="flex-start"
          alignItems="flex-start"
          sx={{ padding: "36px !important" }}
        >
          <table>
            <tr key={"tr-type"}>
              <th style={{ textAlign: "left" }}>
                <Typography variant="body" sx={{ fontFamily: "MyFont" }}>
                  Type
                </Typography>
              </th>
              <th style={{ width: 20 }} />
              <th style={{ textAlign: "left" }}>
                <Typography variant="body" sx={{ fontFamily: "MyFont" }}>
                  Display Label
                </Typography>
              </th>
            </tr>
            {data.map(option => (
              <tr key={"tr-" + option.type}>
                <td key={"td-" + option.t}>
                  <Typography
                    variant="standard"
                    key={"type-" + option.type}
                    sx={{ fontFamily: "MyFont" }}
                  >
                    {option.type}
                  </Typography>
                </td>
                <td style={{ width: 20 }} />
                <td style={{ textAlign: "left" }}>
                  <TextField
                    key={"textfield-" + option.t}
                    sx={{ fontFamily: "MyFont" }}
                    variant="standard"
                    onChange={event => {
                      var newLabels = labels;
                      newLabels[option.type] = event.target.value;
                      setLabels({ ...newLabels });
                    }}
                    InputProps={{ fontFamily: "MyFont" }}
                    value={labels[option.type]}
                  />
                </td>
              </tr>
            ))}
          </table>
        </Grid>
      </Grid>
      <Grid
        container
        spacing={2}
        direction="row"
        justify="flex-end"
        alignItems="flex-end"
        sx={{ padding: "33px !important" }}
      >
        <Button
          sx={{ color: "#fdfdfd", backgroundColor: "#4e89bb" }}
          disabled={_.isEqual(labels, originalLabels)}
          variant="outlined"
          disableElevation
          onClick={() => {
            updateLabels({
              variables: {
                columns: [
                  ...Object.keys(labels).map(key => ({
                    id: key,
                    name: labels[key]
                  }))
                ]
              }
            });
          }}
          size="large"
          type="submit"
        >
          Save
        </Button>
      </Grid>
    </Grid>
  );
};
export default AdminSettings;
