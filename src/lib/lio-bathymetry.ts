/**
 * Ontario Land Information Ontario (LIO) open MapServer — bathymetry contours.
 * Layer metadata: Bathymetry Line (polyline depth contours). Not for navigation.
 * @see https://geohub.lio.gov.on.ca/datasets/mnrf::bathymetry-line/about
 */
export const LIO_OPEN_MAPSERVER_URL =
  "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open01/MapServer";

/** {@link LIO_OPEN_MAPSERVER_URL} sublayer id for “Bathymetry Line”. */
export const LIO_BATHYMETRY_LINE_LAYER_ID = 30;

/** Esri `FeatureLayer` / `…/query` URL for bathymetry line features. */
export const LIO_BATHYMETRY_FEATURE_LAYER_URL = `${LIO_OPEN_MAPSERVER_URL}/${LIO_BATHYMETRY_LINE_LAYER_ID}`;

/** Depth contours load only at this zoom or closer — reduces export traffic at province scale. */
export const LIO_BATHYMETRY_MIN_ZOOM = 11;
