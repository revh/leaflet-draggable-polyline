L.EditDrag = L.EditDrag || {};

L.EditDrag.Polyline = L.Handler.extend({

  options: {
    distance: 30,
    icon: new L.DivIcon({
      iconSize: new L.Point(8, 8),
      className: 'leaflet-div-icon leaflet-editing-icon'
    })
  },

  initialize: function(poly, options) {
    this._poly = poly;
    this._marker = null;
    L.setOptions(this, options);
  },

  addHooks: function() {
    if (this._poly._map) {
      this._map = this._poly._map;
      this._map.on('mouseover', this._mouseOver, this);
    }
  },

  removeHooks: function() {
    this._map.off('mouseover');
    this._map.removeLayer(this._marker);
  },


  _mouseOver: function(e) {
    this._map.on('mousemove', this._mouseMove, this);
  },

  _mouseContextClick: function(e) {
    var closestPoint = L.GeometryUtil.closest(this._map, this._poly, e.target.getLatLng(), true);
    this._poly._latlngs.splice(this._poly._latlngs.indexOf(closestPoint), 1);
    this._poly.redraw();
  },

  _mouseMove: function(e) {
    var closest = this.getClosest(e.latlng);

    if (this._marker) {
      if (closest) {
        this._marker.addTo(this._map);
        L.extend(this._marker._latlng, closest.latlng);
        this._marker.update();
      } else {
        this._map.removeLayer(this._marker)
      }
    } else {
      if (!closest) return;
      this._marker = L.marker(closest.latlng, { draggable: true, icon: this.options.icon }).addTo(this._map);
      this._marker.on('dragstart', this._markerDragStart, this);
      this._marker.on('drag', this._markerDrag, this);
      this._marker.on('contextmenu', this._mouseContextClick, this);
      this._marker.on('dragend', this._markerDragEnd, this);
    }
  },

  _markerDragStart: function(e) {
    var marker = e.target;

    this.closest = L.GeometryUtil.closest(this._map, this._poly, marker.getLatLng(), true);

    //set a tollerance of 5
    if (this.closest.distance > 5) {

      //locate the closest point on the closest segment
      var distanceMin = Infinity;
      var segmentMin = null;

      for (var i = 0, len = (this._poly._latlngs.length -1); i < len; i++) {

        var segment = [this._poly._latlngs[i], this._poly._latlngs[i+1]];
        var distance = L.GeometryUtil.distanceSegment(this._map, marker.getLatLng(), segment[0], segment[1]);
        if (distance < distanceMin) {
          distanceMin = distance;
          segmentMin = segment;
        }
      }

      this.closest = L.GeometryUtil.closestOnSegment(this._map, marker.getLatLng(), segmentMin[0], segmentMin[1]);
      //add a new vertex
      var insertAt = this._poly._latlngs.indexOf(segmentMin[1]);
      this._poly._latlngs.splice(insertAt, 0, this.closest);
    }

    this._poly.off('mousemove');
  },

  _markerDrag: function(e) {
    this.closest.lat = e.target.getLatLng().lat;
    this.closest.lng = e.target.getLatLng().lng;
    this._poly.redraw();
  },

  _markerDragEnd: function(e) {
    this._map.on('mousemove', this._mouseMove, this);
  },

  getClosest: function (latlng) {
    var snapfunc = L.GeometryUtil.closestLayerSnap,
        distance = this.options.distance;
    return snapfunc(this._map, [this._poly], latlng, distance, false);
  }
});

L.Polyline.addInitHook(function() {

  if (this.editDrag) {
    return;
  }

  if (L.EditDrag.Polyline) {
    this.editingDrag = new L.EditDrag.Polyline(this);

    if (this.options.editDrag) {
      this.editingDrag.enable();
    }
  }

  this.on('add', function () {
    if (this.editingDrag && this.editingDrag.enabled()) {
      this.editingDrag.addHooks();
    }
  });

  this.on('remove', function () {
    if (this.editingDrag && this.editingDrag.enabled()) {
      this.editingDrag.removeHooks();
    }
  });
});